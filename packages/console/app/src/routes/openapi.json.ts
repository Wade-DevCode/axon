export async function GET() {
  const response = await fetch(
    "https://raw.githubusercontent.com/Wade-DevCode/axon/main/packages/sdk/openapi.json",
  )
  const json = await response.json()
  return json
}
