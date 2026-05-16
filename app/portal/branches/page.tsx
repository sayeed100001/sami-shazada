'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { CitySearchFixed as CitySearch } from '@/components/ui/city-search-fixed'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Edit,
  Eye,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'

type BranchMetrics = {
  totalTransactions: number
  completedTransactions: number
  outgoingTransactions: number
  incomingTransactions: number
  totalVolume: number
  systemRevenue: number
  branchProfit: number
  systemDiscountCost: number
}

type BranchStaffMember = {
  userId: string
  name: string
  email: string
  phone?: string | null
  systemRole: string
  branchRole: string
}

type BranchManager = {
  id: string
  name: string
  email: string
  phone?: string | null
}

type Branch = {
  id: string
  name: string
  address: string
  phone: string
  city: string
  country: string
  isActive: boolean
  createdAt: string
  manager?: BranchManager | null
  staffMembers: BranchStaffMember[]
  metrics?: BranchMetrics
  _count?: {
    transactions: number
    staff: number
  }
}

type BranchTransaction = {
  id: string
  referenceCode: string
  type: string
  status: string
  fromAmount: number
  fromCurrency: string
  toAmount: number
  toCurrency: string
  systemCommission?: number
  sarafCommission?: number
  systemDiscountAmount?: number
  senderName: string
  receiverName: string
  createdAt: string
}

type BranchDetails = {
  branch: Branch
  metrics: BranchMetrics
  recentTransactions: BranchTransaction[]
}

type AssignableUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  managedBranchCount: number
  staffBranchCount: number
}

type StaffAssignmentForm = {
  userId: string
  role: string
}

type NewUserForm = {
  name: string
  email: string
  phone: string
  password: string
}

type NewStaffForm = NewUserForm & {
  role: string
}

type BranchFormState = {
  name: string
  address: string
  phone: string
  city: string
  country: string
  managerUserId: string
  createManager: boolean
  manager: NewUserForm
  staffAssignments: StaffAssignmentForm[]
  staffMembers: NewStaffForm[]
}

const STAFF_ROLE_VALUES = ['OPERATOR', 'CASHIER', 'MANAGER'] as const
type StaffRoleValue = (typeof STAFF_ROLE_VALUES)[number]

const createEmptyForm = (): BranchFormState => ({
  name: '',
  address: '',
  phone: '',
  city: '',
  country: 'Afghanistan',
  managerUserId: '',
  createManager: false,
  manager: {
    name: '',
    email: '',
    phone: '',
    password: '',
  },
  staffAssignments: [],
  staffMembers: [],
})

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatNumber(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    maximumFractionDigits: 0,
  })
}

function formatDate(value: string, language: Language) {
  return formatLocalizedDate(value, language, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateOnly(value: string, language: Language) {
  return formatLocalizedDate(value, language, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function getStaffRoleLabel(role: string, language: Language) {
  switch (role) {
    case 'OPERATOR':
      return pick(language, 'اپراتور', 'Operator', 'اپریټر')
    case 'CASHIER':
      return pick(language, 'صندوقدار', 'Cashier', 'صندوقدار')
    case 'MANAGER':
      return pick(language, 'سرپرست', 'Supervisor', 'سرپرست')
    default:
      return role
  }
}

function getSystemRoleLabel(role: string, language: Language) {
  switch (role) {
    case 'ADMIN':
      return pick(language, 'مدیر', 'Admin', 'مدیر')
    case 'SARAF':
      return pick(language, 'صراف', 'Saraf', 'صراف')
    case 'BRANCH_MANAGER':
      return pick(language, 'مدیر شعبه', 'Branch manager', 'د څانګې مدیر')
    case 'BRANCH_STAFF':
      return pick(language, 'کارمند شعبه', 'Branch staff', 'د څانګې کارمند')
    case 'USER':
      return pick(language, 'کاربر', 'User', 'کارن')
    default:
      return role
  }
}

function getStatusBadge(status: string, language: Language) {
  if (status === 'COMPLETED') {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">{pick(language, 'تکمیل شده', 'Completed', 'بشپړ شوی')}</Badge>
  }
  if (status === 'PENDING') {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">{pick(language, 'در انتظار', 'Pending', 'په انتظار کې')}</Badge>
  }
  if (status === 'CANCELLED') {
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">{pick(language, 'لغو شده', 'Cancelled', 'لغوه شوی')}</Badge>
  }
  if (status === 'WITHDRAWN') {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">{pick(language, 'برداشت شده', 'Withdrawn', 'ایستل شوی')}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

function getTransactionTypeLabel(type: string, language: Language) {
  switch (type) {
    case 'HAWALA':
      return pick(language, 'حواله', 'Hawala', 'حواله')
    case 'EXCHANGE':
      return pick(language, 'تبدیل ارز', 'Exchange', 'د اسعارو تبادله')
    case 'DEPOSIT':
      return pick(language, 'واریز', 'Deposit', 'جمع')
    case 'WITHDRAWAL':
      return pick(language, 'برداشت', 'Withdrawal', 'ایستل')
    default:
      return type
  }
}

export default function BranchesPage() {
  const { toast } = useToast()
  const { language } = useLanguage()
  const [branches, setBranches] = useState<Branch[]>([])
  const [availableUsers, setAvailableUsers] = useState<AssignableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState<BranchFormState>(createEmptyForm())
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<BranchDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    void fetchBranches()
  }, [])

  const branchSummary = useMemo(() => {
    return branches.reduce(
      (acc, branch) => {
        acc.totalTransactions += branch.metrics?.totalTransactions || branch._count?.transactions || 0
        acc.totalProfit += branch.metrics?.branchProfit || 0
        acc.totalVolume += branch.metrics?.totalVolume || 0
        acc.totalStaff += branch.staffMembers.length + (branch.manager ? 1 : 0)
        return acc
      },
      {
        totalTransactions: 0,
        totalProfit: 0,
        totalVolume: 0,
        totalStaff: 0,
      }
    )
  }, [branches])

  const candidateUsers = useMemo(() => {
    const extraUsers: AssignableUser[] = []

    if (editingBranch?.manager && !availableUsers.some((user) => user.id === editingBranch.manager?.id)) {
      extraUsers.push({
        id: editingBranch.manager.id,
        name: editingBranch.manager.name,
        email: editingBranch.manager.email,
        phone: editingBranch.manager.phone,
        role: 'BRANCH_MANAGER',
        managedBranchCount: 1,
        staffBranchCount: 0,
      })
    }

    for (const staffMember of editingBranch?.staffMembers || []) {
      if (availableUsers.some((user) => user.id === staffMember.userId) || extraUsers.some((user) => user.id === staffMember.userId)) {
        continue
      }

      extraUsers.push({
        id: staffMember.userId,
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone,
        role: staffMember.systemRole,
        managedBranchCount: 0,
        staffBranchCount: 1,
      })
    }

    return [...extraUsers, ...availableUsers]
  }, [availableUsers, editingBranch])

  const t = useMemo(
    () => ({
      back: pick(language, 'بازگشت', 'Back', 'بېرته'),
      title: pick(language, 'مدیریت شعب', 'Branch Management', 'د څانګو مدیریت'),
      subtitle: pick(language, 'مدیریت کامل شعب و کارکنان', 'Manage branches and staff safely', 'د څانګو او کارکوونکو خوندي مدیریت'),
      totalBranches: pick(language, 'کل شعب', 'Total branches', 'ټولې څانګې'),
      assignedPeople: pick(language, 'افراد تعیین شده', 'Assigned people', 'ټاکل شوي خلک'),
      branchProfit: pick(language, 'سود شعبه', 'Branch profit', 'د څانګې ګټه'),
      completedVolume: pick(language, 'حجم تکمیل شده', 'Completed volume', 'بشپړ شوی حجم'),
      newBranch: pick(language, 'شعبه جدید', 'New branch', 'نوې څانګه'),
      editBranch: pick(language, 'ویرایش شعبه', 'Edit branch', 'څانګه سمول'),
      createBranch: pick(language, 'ایجاد شعبه جدید', 'Create a new branch', 'نوې څانګه جوړول'),
      branchDialogDescription: pick(language, 'ایجاد یا ویرایش شعبه و تیم آن', 'Create or edit branch and team', 'څانګه او ټیم جوړ یا سمول'),
      branchName: pick(language, 'نام شعبه', 'Branch name', 'د څانګې نوم'),
      phone: pick(language, 'تلفن', 'Phone', 'تلیفون'),
      address: pick(language, 'آدرس', 'Address', 'پته'),
      city: pick(language, 'شهر', 'City', 'ښار'),
      country: pick(language, 'کشور', 'Country', 'هیواد'),
      selectCity: pick(language, 'انتخاب شهر', 'Select city', 'ښار انتخاب کړئ'),
      branchManager: pick(language, 'مدیر شعبه', 'Branch manager', 'د څانګې مدیر'),
      branchManagerDescription: pick(language, 'مدیر موجود را انتخاب کنید یا مدیر جدید بسازید', 'Assign existing or create new manager', 'موجود مدیر وټاکئ یا نوی جوړ کړئ'),
      createManagerAccount: pick(language, 'ایجاد حساب مدیر جدید', 'Create new manager account', 'د نوي مدیر حساب جوړ کړئ'),
      createManagerDescription: pick(language, 'اگر مدیر تعیین نشده است از این گزینه استفاده کنید', 'Use when no manager is assigned', 'کله چې مدیر نه وي ټاکل شوی دا وکاروئ'),
      managerName: pick(language, 'نام مدیر', 'Manager name', 'د مدیر نوم'),
      managerEmail: pick(language, 'ایمیل مدیر', 'Manager email', 'د مدیر ایمیل'),
      managerPhone: pick(language, 'تلفن مدیر', 'Manager phone', 'د مدیر تلیفون'),
      temporaryPassword: pick(language, 'رمز عبور موقت', 'Temporary password', 'لنډمهاله پټنوم'),
      assignExistingManager: pick(language, 'تعیین مدیر موجود', 'Assign existing manager', 'موجود مدیر وټاکئ'),
      chooseManager: pick(language, 'انتخاب مدیر', 'Choose manager', 'مدیر انتخاب کړئ'),
      noManagerAssigned: pick(language, 'هیچ مدیری تعیین نشده است', 'No manager assigned', 'هیڅ مدیر نه دی ټاکل شوی'),
      existingStaffAssignments: pick(language, 'تعیین کارکنان موجود', 'Existing staff assignments', 'د موجودو کارمندانو ټاکنه'),
      existingStaffDescription: pick(language, 'کارکنان موجود را انتخاب و نقش تعیین کنید', 'Select existing staff and set role', 'موجود کارمندان انتخاب او رول وټاکئ'),
      noReusableUsers: pick(language, 'کاربر قابل استفاده موجود نیست', 'No reusable users available', 'د بیا کارونې کاروونکي نشته'),
      systemRole: pick(language, 'نقش سیستم', 'System role', 'د سیسټم رول'),
      managedBranches: pick(language, 'شعب مدیریت شده', 'Managed branches', 'اداره شوې څانګې'),
      staffAssignments: pick(language, 'تعیینات کارکنان', 'Staff assignments', 'د کارمندانو ټاکنې'),
      staffRole: pick(language, 'نقش کارمند', 'Staff role', 'د کارمند رول'),
      newStaffAccounts: pick(language, 'حسابهای کارکنان جدید', 'New staff accounts', 'د نویو کارمندانو حسابونه'),
      newStaffDescription: pick(language, 'کارمند جدید را مستقیم از این صفحه بسازید', 'Create staff directly from this page', 'له دې پاڼې مستقیم کارمند جوړ کړئ'),
      addStaff: pick(language, 'افزودن کارمند', 'Add staff', 'کارمند اضافه کړئ'),
      noNewStaffRows: pick(language, 'هیچ ردیفی اضافه نشده است', 'No new staff rows added', 'هیڅ نوی قطار نه دی اضافه شوی'),
      newStaffRow: (index: number) => pick(language, `کارمند جدید #${index}`, `New staff #${index}`, `نوی کارمند #${index}`),
      remove: pick(language, 'حذف', 'Remove', 'لرې کول'),
      name: pick(language, 'نام', 'Name', 'نوم'),
      email: pick(language, 'ایمیل', 'Email', 'ایمیل'),
      branchRole: pick(language, 'نقش شعبه', 'Branch role', 'د څانګې رول'),
      cancel: pick(language, 'انصراف', 'Cancel', 'لغوه'),
      saving: pick(language, 'در حال ذخیره...', 'Saving...', 'خوندي کېږي...'),
      updateBranch: pick(language, 'به‌روزرسانی شعبه', 'Update branch', 'څانګه تازه کول'),
      createBranchAction: pick(language, 'ایجاد شعبه', 'Create branch', 'څانګه جوړول'),
      branchDirectory: pick(language, 'فهرست شعب', 'Branch directory', 'د څانګو لست'),
      branchDirectoryDescription: pick(language, 'نمایش مدیر، کارکنان و عملکرد هر شعبه', 'Manager, staff and performance per branch', 'د هرې څانګې مدیر، کارمندان او فعالیت'),
      loadingBranches: pick(language, 'در حال بارگذاری شعب...', 'Loading branches...', 'څانګې لوډېږي...'),
      noBranchesFound: pick(language, 'هیچ شعبه‌ای یافت نشد', 'No branches found', 'هیڅ څانګه ونه موندل شوه'),
      active: pick(language, 'فعال', 'Active', 'فعال'),
      inactive: pick(language, 'غیرفعال', 'Inactive', 'غیرفعال'),
      manager: pick(language, 'مدیر', 'Manager', 'مدیر'),
      notAssigned: pick(language, 'تعیین نشده', 'Not assigned', 'نه دی ټاکل شوی'),
      transactions: pick(language, 'تراکنش‌ها', 'Transactions', 'تراکنشونه'),
      volume: pick(language, 'حجم', 'Volume', 'حجم'),
      people: pick(language, 'افراد', 'People', 'خلک'),
      more: (count: number) => pick(language, `+${count} مورد دیگر`, `+${count} more`, `+${count} نور`),
      branchDetails: pick(language, 'جزئیات شعبه', 'Branch details', 'د څانګې جزئیات'),
      branchDetailsDescription: pick(language, 'بررسی کامل اطلاعات شعبه', 'Review branch details', 'د څانګې بشپړ معلومات'),
      loadingDetails: pick(language, 'در حال بارگذاری جزئیات...', 'Loading details...', 'جزئیات لوډېږي...'),
      overview: pick(language, 'نمای کلی', 'Overview', 'عمومي کتنه'),
      peopleTab: pick(language, 'افراد', 'People', 'خلک'),
      transactionsTab: pick(language, 'تراکنش‌ها', 'Transactions', 'تراکنشونه'),
      totalTransactions: pick(language, 'کل تراکنش‌ها', 'Total transactions', 'ټولې تراکنشونه'),
      completed: pick(language, 'تکمیل شده', 'Completed', 'بشپړ شوی'),
      systemRevenue: pick(language, 'درآمد سیستم', 'System revenue', 'د سیسټم عاید'),
      branchProfile: pick(language, 'پروفایل شعبه', 'Branch profile', 'د څانګې پروفایل'),
      location: pick(language, 'موقعیت', 'Location', 'ځای'),
      created: pick(language, 'ایجاد شده', 'Created', 'جوړ شوی'),
      operationalTotals: pick(language, 'مجموع عملیاتی', 'Operational totals', 'عملیاتي مجموع'),
      incomingTransactions: pick(language, 'تراکنش‌های ورودی', 'Incoming transactions', 'ورودي تراکنشونه'),
      outgoingTransactions: pick(language, 'تراکنش‌های خروجی', 'Outgoing transactions', 'وتونکي تراکنشونه'),
      systemDiscountCost: pick(language, 'هزینه تخفیف سیستم', 'System discount cost', 'د سیسټم د تخفیف لګښت'),
      staffRoster: pick(language, 'فهرست کارکنان', 'Staff roster', 'د کارمندانو لست'),
      noStaffAssigned: pick(language, 'هیچ کارمندی تعیین نشده است', 'No staff assigned', 'هیڅ کارمند نه دی ټاکل شوی'),
      noTransactions: pick(language, 'هیچ تراکنشی یافت نشد', 'No transactions found', 'هیڅ تراکنش ونه موندل شو'),
      senderToReceiver: pick(language, 'فرستنده به گیرنده', 'Sender to receiver', 'لېږونکی تر ترلاسه کوونکي'),
      amounts: pick(language, 'مبالغ', 'Amounts', 'مبالغ'),
      confirmDelete: pick(language, 'این شعبه حذف شود؟', 'Delete this branch?', 'دا څانګه حذف شي؟'),
      loadFailed: pick(language, 'بارگذاری ناموفق بود', 'Load failed', 'لوډ ناکام شو'),
      unableToLoadBranches: pick(language, 'بارگذاری شعب ممکن نشد', 'Unable to load branches', 'څانګې پورته نه شوې'),
      saveFailed: pick(language, 'ذخیره ناموفق بود', 'Save failed', 'خوندي کول ناکام شول'),
      unableToSaveBranch: pick(language, 'ذخیره شعبه ممکن نشد', 'Unable to save branch', 'څانګه خوندي نه شوه'),
      branchUpdated: pick(language, 'شعبه به‌روزرسانی شد', 'Branch updated', 'څانګه تازه شوه'),
      branchUpdatedDescription: pick(language, 'اطلاعات شعبه به‌روزرسانی شد', 'Branch was updated', 'د څانګې معلومات تازه شول'),
      branchCreated: pick(language, 'شعبه ایجاد شد', 'Branch created', 'څانګه جوړه شوه'),
      branchCreatedDescription: pick(language, 'شعبه جدید با موفقیت ایجاد شد', 'Branch created successfully', 'نوې څانګه په بریالیتوب جوړه شوه'),
      branchDeleted: pick(language, 'شعبه حذف شد', 'Branch deleted', 'څانګه حذف شوه'),
      branchDeletedDescription: pick(language, 'شعبه با موفقیت حذف شد', 'Branch deleted successfully', 'څانګه په بریالیتوب حذف شوه'),
      deleteFailed: pick(language, 'حذف ناموفق بود', 'Delete failed', 'حذف ناکام شو'),
      unableToDeleteBranch: pick(language, 'حذف شعبه ممکن نشد', 'Unable to delete branch', 'څانګه حذف نه شوه'),
      statusUpdated: pick(language, 'وضعیت به‌روزرسانی شد', 'Status updated', 'حالت تازه شو'),
      statusDescription: (name: string, isNowActive: boolean) => `${name} is now ${isNowActive ? 'active' : 'inactive'}.`,
      statusUpdateFailed: pick(language, 'به‌روزرسانی وضعیت ناموفق بود', 'Status update failed', 'د حالت تازه کول ناکام شول'),
      unableToChangeStatus: pick(language, 'تغییر وضعیت ممکن نشد', 'Unable to change status', 'حالت بدل نه شو'),
      unableToLoadBranchDetails: pick(language, 'بارگذاری جزئیات شعبه ممکن نشد', 'Unable to load branch details', 'د څانګې جزئیات پورته نه شول'),
    }),
    [language]
  )

  async function fetchBranches() {
    try {
      const response = await fetch('/api/portal/branches', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load branches')
      }

      setBranches(data.branches || [])
      setAvailableUsers(data.availableUsers || [])
    } catch (error) {
      toast({
        title: t.loadFailed,
        description: error instanceof Error ? error.message : t.unableToLoadBranches,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function resetDialogState() {
    setEditingBranch(null)
    setFormData(createEmptyForm())
    setShowFormDialog(false)
  }

  function openCreateDialog() {
    setEditingBranch(null)
    setFormData(createEmptyForm())
    setShowFormDialog(true)
  }

  function openEditDialog(branch: Branch) {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      city: branch.city,
      country: branch.country,
      managerUserId: branch.manager?.id || '',
      createManager: false,
      manager: {
        name: '',
        email: '',
        phone: '',
        password: '',
      },
      staffAssignments: branch.staffMembers.map((member) => ({
        userId: member.userId,
        role: member.branchRole || 'OPERATOR',
      })),
      staffMembers: [],
    })
    setShowFormDialog(true)
  }

  function toggleExistingStaff(userId: string, checked: boolean) {
    setFormData((prev) => {
      const exists = prev.staffAssignments.some((assignment) => assignment.userId === userId)
      if (checked && !exists) {
        return {
          ...prev,
          staffAssignments: [...prev.staffAssignments, { userId, role: 'OPERATOR' }],
        }
      }

      if (!checked && exists) {
        return {
          ...prev,
          staffAssignments: prev.staffAssignments.filter((assignment) => assignment.userId !== userId),
        }
      }

      return prev
    })
  }

  function updateExistingStaffRole(userId: string, role: string) {
    setFormData((prev) => ({
      ...prev,
      staffAssignments: prev.staffAssignments.map((assignment) =>
        assignment.userId === userId ? { ...assignment, role } : assignment
      ),
    }))
  }

  function addNewStaffRow() {
    setFormData((prev) => ({
      ...prev,
      staffMembers: [
        ...prev.staffMembers,
        {
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'OPERATOR',
        },
      ],
    }))
  }

  function updateNewStaffRow(index: number, field: keyof NewStaffForm, value: string) {
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      ),
    }))
  }

  function removeNewStaffRow(index: number) {
    setFormData((prev) => ({
      ...prev,
      staffMembers: prev.staffMembers.filter((_, memberIndex) => memberIndex !== index),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,
        staffAssignments: formData.staffAssignments,
        staffMembers: formData.staffMembers.filter((member) => member.name && member.email && member.password),
      }

      if (formData.createManager) {
        payload.manager = formData.manager
      } else if (formData.managerUserId) {
        payload.managerUserId = formData.managerUserId
      } else if (editingBranch) {
        payload.clearManager = true
      }

      const response = await fetch(
        editingBranch ? `/api/portal/branches/${editingBranch.id}` : '/api/portal/branches',
        {
          method: editingBranch ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branch')
      }

      toast({
        title: editingBranch ? t.branchUpdated : t.branchCreated,
        description: editingBranch ? t.branchUpdatedDescription : t.branchCreatedDescription,
      })

      await fetchBranches()
      resetDialogState()
    } catch (error) {
      toast({
        title: t.saveFailed,
        description: error instanceof Error ? error.message : t.unableToSaveBranch,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(branchId: string) {
    if (!window.confirm(t.confirmDelete)) {
      return
    }

    try {
      const response = await fetch(`/api/portal/branches/${branchId}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete branch')
      }

      toast({
        title: t.branchDeleted,
        description: t.branchDeletedDescription,
      })
      await fetchBranches()
    } catch (error) {
      toast({
        title: t.deleteFailed,
        description: error instanceof Error ? error.message : t.unableToDeleteBranch,
        variant: 'destructive',
      })
    }
  }

  async function handleToggleActive(branch: Branch) {
    try {
      const response = await fetch(`/api/portal/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !branch.isActive }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update branch status')
      }

      toast({
        title: t.statusUpdated,
        description: t.statusDescription(branch.name, !branch.isActive),
      })
      await fetchBranches()
    } catch (error) {
      toast({
        title: t.statusUpdateFailed,
        description: error instanceof Error ? error.message : t.unableToChangeStatus,
        variant: 'destructive',
      })
    }
  }

  async function viewBranchDetails(branchId: string) {
    setDetailsLoading(true)
    setShowDetailsDialog(true)

    try {
      const response = await fetch(`/api/portal/branches/${branchId}`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load branch details')
      }

      setSelectedBranchDetails(data)
    } catch (error) {
      toast({
        title: t.loadFailed,
        description: error instanceof Error ? error.message : t.unableToLoadBranchDetails,
        variant: 'destructive',
      })
      setShowDetailsDialog(false)
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/portal">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.back}
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold">{t.title}</h1>
          <p className="mt-2 text-lg text-white/90">
            {t.subtitle}
          </p>
        </div>

        <div className="space-y-6 px-2 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalBranches}</p>
                    <p className="text-2xl font-bold">{formatNumber(branches.length, language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.assignedPeople}</p>
                    <p className="text-2xl font-bold">{formatNumber(branchSummary.totalStaff, language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.branchProfit}</p>
                    <p className="text-2xl font-bold">{formatNumber(branchSummary.totalProfit, language)} AFN</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500 text-white shadow-lg">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.completedVolume}</p>
                    <p className="text-2xl font-bold">{formatNumber(branchSummary.totalVolume, language)} AFN</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end">
            <Dialog
              open={showFormDialog}
              onOpenChange={(open) => {
                if (!open) {
                  resetDialogState()
                  return
                }
                setShowFormDialog(true)
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t.newBranch}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBranch ? t.editBranch : t.createBranch}</DialogTitle>
                  <DialogDescription>{t.branchDialogDescription}</DialogDescription>
                </DialogHeader>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="branch-name">{t.branchName}</Label>
                      <Input
                        id="branch-name"
                        value={formData.name}
                        onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branch-phone">{t.phone}</Label>
                      <Input
                        id="branch-phone"
                        value={formData.phone}
                        onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="branch-address">{t.address}</Label>
                      <Input
                        id="branch-address"
                        value={formData.address}
                        onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.city}</Label>
                      <CitySearch
                        value={formData.city}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
                        placeholder={t.selectCity}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branch-country">{t.country}</Label>
                      <Input
                        id="branch-country"
                        value={formData.country}
                        onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <Card className="border border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t.branchManager}</CardTitle>
                      <CardDescription>{t.branchManagerDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div>
                          <p className="font-medium">{t.createManagerAccount}</p>
                          <p className="text-sm text-muted-foreground">{t.createManagerDescription}</p>
                        </div>
                        <Switch
                          checked={formData.createManager}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              createManager: checked,
                              managerUserId: checked ? '' : prev.managerUserId,
                            }))
                          }
                        />
                      </div>

                      {formData.createManager ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t.managerName}</Label>
                            <Input
                              value={formData.manager.name}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  manager: { ...prev.manager, name: event.target.value },
                                }))
                              }
                              required={formData.createManager}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.managerEmail}</Label>
                            <Input
                              type="email"
                              value={formData.manager.email}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  manager: { ...prev.manager, email: event.target.value },
                                }))
                              }
                              required={formData.createManager}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.managerPhone}</Label>
                            <Input
                              value={formData.manager.phone}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  manager: { ...prev.manager, phone: event.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.temporaryPassword}</Label>
                            <Input
                              type="password"
                              value={formData.manager.password}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  manager: { ...prev.manager, password: event.target.value },
                                }))
                              }
                              required={formData.createManager}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>{t.assignExistingManager}</Label>
                          <Select
                            value={formData.managerUserId || 'NONE'}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                managerUserId: value === 'NONE' ? '' : value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t.chooseManager} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">{t.noManagerAssigned}</SelectItem>
                              {candidateUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t.existingStaffAssignments}</CardTitle>
                      <CardDescription>{t.existingStaffDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {candidateUsers.filter((user) => user.id !== formData.managerUserId).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.noReusableUsers}</p>
                      ) : (
                        candidateUsers
                          .filter((user) => user.id !== formData.managerUserId)
                          .map((user) => {
                            const selected = formData.staffAssignments.some((assignment) => assignment.userId === user.id)
                            const selectedRole =
                              formData.staffAssignments.find((assignment) => assignment.userId === user.id)?.role ||
                              'OPERATOR'

                            return (
                              <div
                                key={user.id}
                                className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-[1fr,180px]"
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) => toggleExistingStaff(user.id, Boolean(checked))}
                                    className="mt-1"
                                  />
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {t.systemRole}: {getSystemRoleLabel(user.role, language)} | {t.managedBranches}: {formatNumber(user.managedBranchCount, language)} | {t.staffAssignments}: {formatNumber(user.staffBranchCount, language)}
                                    </p>
                                  </div>
                                </div>

                                <Select
                                  value={selectedRole}
                                  onValueChange={(value) => updateExistingStaffRole(user.id, value)}
                                  disabled={!selected}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t.staffRole} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STAFF_ROLE_VALUES.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {getStaffRoleLabel(role, language)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )
                          })
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{t.newStaffAccounts}</CardTitle>
                          <CardDescription>{t.newStaffDescription}</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={addNewStaffRow}>
                          <Plus className="mr-2 h-4 w-4" />
                          {t.addStaff}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.staffMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.noNewStaffRows}</p>
                      ) : (
                        formData.staffMembers.map((member, index) => (
                          <div key={`new-staff-${index}`} className="rounded-lg border border-border/60 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="font-medium">{t.newStaffRow(index + 1)}</p>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeNewStaffRow(index)}>
                                {t.remove}
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{t.name}</Label>
                                <Input
                                  value={member.name}
                                  onChange={(event) => updateNewStaffRow(index, 'name', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.email}</Label>
                                <Input
                                  type="email"
                                  value={member.email}
                                  onChange={(event) => updateNewStaffRow(index, 'email', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.phone}</Label>
                                <Input
                                  value={member.phone}
                                  onChange={(event) => updateNewStaffRow(index, 'phone', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.temporaryPassword}</Label>
                                <Input
                                  type="password"
                                  value={member.password}
                                  onChange={(event) => updateNewStaffRow(index, 'password', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.branchRole}</Label>
                                <Select
                                  value={member.role}
                                  onValueChange={(value) => updateNewStaffRow(index, 'role', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STAFF_ROLE_VALUES.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {getStaffRoleLabel(role, language)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetDialogState}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : editingBranch ? 'Update branch' : 'Create branch'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t.branchDirectory}</CardTitle>
              <CardDescription>{t.branchDirectoryDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">{t.loadingBranches}</div>
              ) : branches.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">{t.noBranchesFound}</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {branches.map((branch) => (
                    <Card key={branch.id} className="border-l-4 border-l-indigo-500">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{branch.name}</h3>
                              <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                                {branch.isActive ? t.active : t.inactive}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {branch.city}, {branch.country}
                            </p>
                          </div>

                          <Switch checked={branch.isActive} onCheckedChange={() => handleToggleActive(branch)} />
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{branch.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <UserCog className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              {t.manager}: {branch.manager ? `${branch.manager.name} (${branch.manager.email})` : t.notAssigned}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t.transactions}</p>
                            <p className="font-semibold">{formatNumber(branch.metrics?.totalTransactions || 0, language)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t.branchProfit}</p>
                            <p className="font-semibold">{formatNumber(branch.metrics?.branchProfit || 0, language)} AFN</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t.volume}</p>
                            <p className="font-semibold">{formatNumber(branch.metrics?.totalVolume || 0, language)} AFN</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t.people}</p>
                            <p className="font-semibold">
                              {formatNumber((branch.manager ? 1 : 0) + branch.staffMembers.length, language)}
                            </p>
                          </div>
                        </div>

                        {branch.staffMembers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {branch.staffMembers.slice(0, 4).map((member) => (
                              <Badge key={member.userId} variant="outline">
                                {member.name} - {getStaffRoleLabel(member.branchRole, language)}
                              </Badge>
                            ))}
                            {branch.staffMembers.length > 4 && (
                              <Badge variant="secondary">{t.more(branch.staffMembers.length - 4)}</Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => void viewBranchDetails(branch.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(branch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleDelete(branch.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={showDetailsDialog}
            onOpenChange={(open) => {
              setShowDetailsDialog(open)
              if (!open) {
                setSelectedBranchDetails(null)
              }
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedBranchDetails?.branch.name || t.branchDetails}</DialogTitle>
                <DialogDescription>{t.branchDetailsDescription}</DialogDescription>
              </DialogHeader>
              {detailsLoading || !selectedBranchDetails ? (
                <div className="py-10 text-center text-muted-foreground">{t.loadingDetails}</div>
              ) : (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">{t.overview}</TabsTrigger>
                    <TabsTrigger value="people">{t.peopleTab}</TabsTrigger>
                    <TabsTrigger value="transactions">{t.transactionsTab}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{t.totalTransactions}</p>
                          <p className="text-2xl font-bold">{formatNumber(selectedBranchDetails.metrics.totalTransactions, language)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{t.completed}</p>
                          <p className="text-2xl font-bold">{formatNumber(selectedBranchDetails.metrics.completedTransactions, language)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{t.branchProfit}</p>
                          <p className="text-2xl font-bold">
                            {formatNumber(selectedBranchDetails.metrics.branchProfit, language)} AFN
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{t.systemRevenue}</p>
                          <p className="text-2xl font-bold">
                            {formatNumber(selectedBranchDetails.metrics.systemRevenue, language)} AFN
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Branch profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p>
                            <span className="font-medium">Address:</span> {selectedBranchDetails.branch.address}
                          </p>
                          <p>
                            <span className="font-medium">Phone:</span> {selectedBranchDetails.branch.phone}
                          </p>
                          <p>
                            <span className="font-medium">Location:</span> {selectedBranchDetails.branch.city},{' '}
                            {selectedBranchDetails.branch.country}
                          </p>
                          <p>
                            <span className="font-medium">Created:</span>{' '}
                            {formatDateOnly(selectedBranchDetails.branch.createdAt, language)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Operational totals</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p>
                            <span className="font-medium">Incoming transactions:</span>{' '}
                            {formatNumber(selectedBranchDetails.metrics.incomingTransactions, language)}
                          </p>
                          <p>
                            <span className="font-medium">Outgoing transactions:</span>{' '}
                            {formatNumber(selectedBranchDetails.metrics.outgoingTransactions, language)}
                          </p>
                          <p>
                            <span className="font-medium">Completed volume:</span>{' '}
                            {formatNumber(selectedBranchDetails.metrics.totalVolume, language)} AFN
                          </p>
                          <p>
                            <span className="font-medium">System discount cost:</span>{' '}
                            {formatNumber(selectedBranchDetails.metrics.systemDiscountCost, language)} AFN
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="people" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Manager</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedBranchDetails.branch.manager ? (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">{selectedBranchDetails.branch.manager.name}</p>
                            <p className="text-muted-foreground">{selectedBranchDetails.branch.manager.email}</p>
                            {selectedBranchDetails.branch.manager.phone && (
                              <p className="text-muted-foreground">{selectedBranchDetails.branch.manager.phone}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t.noManagerAssigned}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t.staffRoster}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedBranchDetails.branch.staffMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t.noStaffAssigned}</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedBranchDetails.branch.staffMembers.map((member) => (
                              <div
                                key={member.userId}
                                className="flex flex-col justify-between gap-2 rounded-lg border border-border/60 p-3 md:flex-row md:items-center"
                              >
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                  {member.phone && <p className="text-sm text-muted-foreground">{member.phone}</p>}
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">{getStaffRoleLabel(member.branchRole, language)}</Badge>
                                  <Badge variant="secondary">{getSystemRoleLabel(member.systemRole, language)}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-4">
                    {selectedBranchDetails.recentTransactions.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground">{t.noTransactions}</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedBranchDetails.recentTransactions.map((transaction) => (
                          <Card key={transaction.id}>
                            <CardContent className="space-y-3 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{transaction.referenceCode}</p>
                                  {getStatusBadge(transaction.status, language)}
                                  <Badge variant="outline">{getTransactionTypeLabel(transaction.type, language)}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(transaction.createdAt, language)}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-muted-foreground">{t.senderToReceiver}</p>
                                  <p className="font-medium">
                                    {transaction.senderName} → {transaction.receiverName}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t.amounts}</p>
                                  <p className="font-medium">
                                    {formatNumber(transaction.fromAmount, language)} {transaction.fromCurrency} →
                                    {formatNumber(transaction.toAmount, language)} {transaction.toCurrency}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t.systemRevenue}</p>
                                  <p className="font-medium">
                                    {formatNumber(transaction.systemCommission || 0, language)} AFN
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t.branchProfit}</p>
                                  <p className="font-medium">
                                    {formatNumber(transaction.sarafCommission || 0, language)} AFN
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
}
