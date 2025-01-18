"use client";

import { ProjectTree } from "@/components/ProjectTree";
import { CucumberTree } from "@/components/CucumberTree";
import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Home() {
  const [isCucumberVisible, setIsCucumberVisible] = useState(true);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[90rem] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Project Explorer</h1>
          <p className="mt-2 text-sm text-gray-600">Projelerinizi ve test senaryolarınızı kolayca yönetin.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={isCucumberVisible ? "lg:col-span-6" : "lg:col-span-12"}>
            <ProjectTree isCompact={isCucumberVisible} />
          </div>
          <div className={`lg:col-span-6 transition-all duration-300 ${!isCucumberVisible ? "hidden lg:block lg:w-0 lg:overflow-hidden lg:opacity-0" : "lg:w-auto lg:opacity-100"}`}>
            <div className="relative">
              <button
                onClick={() => setIsCucumberVisible(false)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white shadow-md border text-gray-600 hover:text-gray-900 lg:flex hidden items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <CucumberTree />
            </div>
          </div>
        </div>
        {!isCucumberVisible && (
          <button
            onClick={() => setIsCucumberVisible(true)}
            className="fixed right-6 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white shadow-md border text-gray-600 hover:text-gray-900 lg:flex hidden items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </main>
  );
}
