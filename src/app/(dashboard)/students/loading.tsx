export default function StudentsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
