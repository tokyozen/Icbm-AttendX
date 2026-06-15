export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm h-48">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-3 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
