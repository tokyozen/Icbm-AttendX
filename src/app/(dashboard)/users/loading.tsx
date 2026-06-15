export default function UsersLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="flex gap-4 border-b pb-0">
        <div className="h-10 w-28 bg-gray-200 rounded-t animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 rounded-t animate-pulse" />
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
