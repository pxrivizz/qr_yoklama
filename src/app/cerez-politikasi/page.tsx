import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Çerez Politikası | DersDevam",
  description: "DersDevam tarafından kullanılan zorunlu çerez ve yerel depolama kayıtları.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Çerez Politikası"
      summary="DersDevam şu anda reklam, pazarlama veya ziyaretçi analizi çerezi kullanmaz. Aşağıdaki teknik kayıtlar giriş, güvenlik ve yoklama doğrulaması için zorunludur."
      sections={[
        {
          id: "yaklasim",
          title: "Yaklaşımımız",
          content: (
            <div className="space-y-3">
              <p>Kesinlikle gerekli çerezler, talep ettiğiniz hizmetin çalışması ve güvenliğinin sağlanması için kullanılır. Bu çerezler pazarlama amacıyla kullanılmaz ve açık rızaya dayalı değildir.</p>
              <p>İleride işlevsel veya analiz amaçlı bir teknoloji eklenirse, ilgili kategori varsayılan olarak kapalı olacak ve çalıştırılmadan önce ayrı tercihiniz istenecektir.</p>
            </div>
          ),
        },
        {
          id: "kayitlar",
          title: "Kullanılan kayıtlar",
          content: (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs leading-5">
                <thead>
                  <tr className="border-b border-neutral-300 text-neutral-950">
                    <th className="py-3 pr-4 font-semibold">Kayıt</th>
                    <th className="py-3 pr-4 font-semibold">Amaç</th>
                    <th className="py-3 pr-4 font-semibold">Süre</th>
                    <th className="py-3 font-semibold">Tür</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr><td className="py-3 pr-4 font-mono text-[11px]">authjs.*</td><td className="py-3 pr-4">Güvenli giriş, CSRF koruması ve oturum yönlendirmesi</td><td className="py-3 pr-4">Oturum / en fazla 20 dakika</td><td className="py-3">Birinci taraf, zorunlu</td></tr>
                  <tr><td className="py-3 pr-4 font-mono text-[11px]">qr_attendance_device</td><td className="py-3 pr-4">Aynı cihazla mükerrer veya farklı hesaplı yoklama denemelerini önleme</td><td className="py-3 pr-4">1 yıl</td><td className="py-3">Birinci taraf, zorunlu</td></tr>
                  <tr><td className="py-3 pr-4 font-mono text-[11px]">teacher_impersonation</td><td className="py-3 pr-4">Yöneticinin destek amacıyla öğretmen görünümüne güvenli geçişi</td><td className="py-3 pr-4">15 dakika</td><td className="py-3">Birinci taraf, zorunlu</td></tr>
                  <tr><td className="py-3 pr-4 font-mono text-[11px]">dersdevam:cookie-notice:*</td><td className="py-3 pr-4">Çerez bilgilendirmesini gördüğünüzü hatırlama</td><td className="py-3 pr-4">Metin sürümü değişene kadar</td><td className="py-3">Yerel depolama, zorunlu</td></tr>
                  <tr><td className="py-3 pr-4 font-mono text-[11px]">qr-yoklama:last-activity</td><td className="py-3 pr-4">Hareketsiz oturumu güvenli biçimde sonlandırma</td><td className="py-3 pr-4">Aktif oturum boyunca</td><td className="py-3">Yerel depolama, zorunlu</td></tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "yonetim",
          title: "Çerezleri yönetme",
          content: (
            <div className="space-y-3">
              <p>Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellemeniz hâlinde giriş, QR yoklama, cihaz doğrulaması veya güvenli oturum özellikleri çalışmayabilir.</p>
              <p>Bilgilendirme kaydını temizlemek için tarayıcınızın bu siteye ait yerel depolama verilerini silebilirsiniz. Metin sürümü değiştiğinde bilgilendirme yeniden gösterilir.</p>
            </div>
          ),
        },
        {
          id: "ucuncu-taraf",
          title: "Üçüncü taraf hizmetler",
          content: (
            <p>Öğrenci girişinde Google OAuth kullanılır. Google’a ait sayfada oluşturulan çerezler Google’ın kendi politikalarına tabidir; DersDevam bu çerezlerin içeriğini veya süresini belirlemez. DersDevam sayfalarında üçüncü taraf reklam ya da analiz etiketi çalıştırılmaz.</p>
          ),
        },
      ]}
    />
  );
}
