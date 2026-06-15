export default function SessionsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2 mt-4">
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
