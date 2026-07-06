import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function addCompany(formData: FormData) {
  "use server";
  
  const companyName = formData.get("company_name")?.toString().trim();

  if (companyName) {
    await prisma.companies.create({
      data: {
        company_name: companyName,
      },
    });

    revalidatePath("/companies");
  }
}


export default async function CompaniesPage() {

  const companies = await prisma.companies.findMany({
    orderBy: {
      company_name: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">จัดการบริษัท</h1>
        <p className="text-sm text-gray-500 mt-1">เพิ่มและดูรายชื่อบริษัททั้งหมดในระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">เพิ่มบริษัทใหม่</h3>
            
            <form action={addCompany} className="space-y-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อบริษัท <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  required
                  placeholder="กรอกชื่อบริษัท..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                + บันทึกบริษัท
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">รายชื่อบริษัททั้งหมด</h3>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                รวม {companies.length} บริษัท
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-16">ID</th>
                    <th className="px-6 py-4 font-semibold">ชื่อบริษัท</th>
                    <th className="px-6 py-4 font-semibold w-40 text-right">วันที่เพิ่ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                        ยังไม่มีข้อมูลบริษัทในระบบ
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-400">{company.id}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{company.company_name}</td>
                        <td className="px-6 py-4 text-right text-xs text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}