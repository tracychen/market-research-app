"use client";

import { formatDate, formatFileSize } from "@/lib/utils";
import { useState, useEffect } from "react";

interface File {
  name: string;
  type: string;
  size: number;
  created: string;
}

export default function FileList({
  refreshTrigger,
}: {
  refreshTrigger: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/files");

        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }

        const data = await response.json();
        setFiles(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching files:", err);
        setError("Failed to load files. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [refreshTrigger]);

  const handleDownload = (filename: string) => {
    window.open(`/api/download/${filename}`, "_blank");
  };

  if (loading) {
    return <div className="text-center py-8">Loading files...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (files.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Generated Files</h2>
        <p className="text-gray-500">
          No files generated yet. Select states to analyze.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Generated Files</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file, index) => (
              <tr key={`${file.name}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {file.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(file.created)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDownload(file.name)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
