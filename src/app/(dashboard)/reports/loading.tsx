export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
