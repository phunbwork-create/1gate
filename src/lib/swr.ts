import useSWR, { SWRConfiguration } from "swr"

// Default fetcher for SWR — throws on non-ok responses
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error("API request failed")
    // Attach extra info to the error object
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

// Default SWR options for the app
const defaultOptions: SWRConfiguration = {
  revalidateOnFocus: false,       // Don't refetch when tab regains focus
  dedupingInterval: 5000,         // Dedup identical requests within 5s
  errorRetryCount: 2,             // Only retry failed requests 2 times
}

/**
 * App-wide SWR hook with sensible defaults.
 * Usage: const { data, error, isLoading, mutate } = useAppSWR("/api/advances?page=1")
 */
export function useAppSWR<T = any>(
  key: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(key, fetcher, { ...defaultOptions, ...options })
}

export { fetcher }
