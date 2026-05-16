import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeInput, validateNumericInput } from '@/lib/security';

export const dynamic = 'force-dynamic'

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .filter((v): v is string => typeof v === 'string')
          .map((v) => sanitizeInput(v))
          .filter(Boolean)
      )
    ).slice(0, 100)
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []

    // Try JSON first (e.g., '["a","b"]')
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return normalizeFeatures(parsed)
    } catch {
      // ignore
    }

    // Fallback to comma-separated
    return normalizeFeatures(trimmed.split(','))
  }

  return []
}

// GET /api/admin/packages - Get all package configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packages = await prisma.packageConfig.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      packages,
    });
  } catch (error: any) {
    console.error('Get packages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST /api/admin/packages - Create or update package
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      name,
      price,
      credits,
      maxBranches,
      features,
      isActive,
      displayOrder,
      description,
      highlightFeature,
    } = body;

    if (!type || !name || price === undefined || credits === undefined || maxBranches === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['PRO', 'PREMIUM', 'ENTERPRISE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    // Allow -1 to represent unlimited branches
    const maxBranchesValueRaw = Number(maxBranches)
    const maxBranchesValue = Number.isFinite(maxBranchesValueRaw) ? Math.trunc(maxBranchesValueRaw) : NaN
    if (!Number.isFinite(maxBranchesValue) || maxBranchesValue < -1) {
      return NextResponse.json(
        { error: 'Invalid maxBranches' },
        { status: 400 }
      )
    }

    // Check if package exists
    const existingPackage = await prisma.packageConfig.findUnique({
      where: { type },
    });

    let packageConfig;

    if (existingPackage) {
      // Update existing package
      packageConfig = await prisma.packageConfig.update({
        where: { type },
        data: {
          name: sanitizeInput(name),
          price: Math.floor(validateNumericInput(price) || 0),
          credits: Math.floor(validateNumericInput(credits) || 0),
          maxBranches: maxBranchesValue,
          features: normalizeFeatures(features),
          isActive: isActive !== undefined ? isActive : true,
          displayOrder: Math.floor(validateNumericInput(displayOrder) || 0),
          description: description ? sanitizeInput(description) : null,
          highlightFeature: highlightFeature ? sanitizeInput(highlightFeature) : null,
        },
      });
    } else {
      // Create new package
      packageConfig = await prisma.packageConfig.create({
        data: {
          type,
          name: sanitizeInput(name),
          price: Math.floor(validateNumericInput(price) || 0),
          credits: Math.floor(validateNumericInput(credits) || 0),
          maxBranches: maxBranchesValue,
          features: normalizeFeatures(features),
          isActive: isActive !== undefined ? isActive : true,
          displayOrder: Math.floor(validateNumericInput(displayOrder) || 0),
          description: description ? sanitizeInput(description) : null,
          highlightFeature: highlightFeature ? sanitizeInput(highlightFeature) : null,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: existingPackage ? 'PACKAGE_UPDATED' : 'PACKAGE_CREATED',
        resource: 'PACKAGE_CONFIG',
        resourceId: packageConfig.id,
        details: JSON.stringify({ type, name, price, credits }),
      },
    });

    return NextResponse.json({
      success: true,
      package: packageConfig,
      message: existingPackage ? 'Package updated successfully' : 'Package created successfully',
    });
  } catch (error: any) {
    console.error('Create/Update package error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save package' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/packages - Toggle package active status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, isActive } = body;

    if (!type || isActive === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const packageConfig = await prisma.packageConfig.update({
      where: { type },
      data: { isActive },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PACKAGE_STATUS_CHANGED',
        resource: 'PACKAGE_CONFIG',
        resourceId: packageConfig.id,
        details: JSON.stringify({ type, isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      package: packageConfig,
      message: `Package ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Toggle package status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update package status' },
      { status: 500 }
    );
  }
}
