import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function addCategory(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (name) {
    await prisma.categories.create({
      data: { name, description },
    });
    revalidatePath("/categories");
  }
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id")?.toString() || "0");
  if (id > 0) {
    await prisma.categories.delete({ where: { id } });
    revalidatePath("/categories");
  }
}

export default async function CategoriesPage() {
  const categories = await prisma.categories.findMany({
    orderBy: { id: "desc" },
  });

  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="break-words text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">หมวดหมู่เอกสาร</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการประเภทของเอกสารในระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">เพิ่มหมวดหมู่ใหม่</h3>
            <form action={addCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวดหมู่ <span className="text-red-500">*</span></label>
                <input type="text" name="name" required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                <input type="text" name="description" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                + บันทึก
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">ชื่อหมวดหมู่</th>
                  <th className="px-6 py-4 font-semibold">รายละเอียด</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">{cat.name}</td>
                    <td className="px-6 py-4">{cat.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <button type="submit" className="text-red-500 hover:text-red-700 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded-md">
                          ลบทิ้ง
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
