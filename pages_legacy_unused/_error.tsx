import type { NextPageContext } from "next"

type Props = { statusCode?: number }

function ErrorPage({ statusCode }: Props) {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h1>Something went wrong</h1>
      {statusCode ? <p>Status code: {statusCode}</p> : <p>An unexpected error occurred.</p>}
    </main>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage