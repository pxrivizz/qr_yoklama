import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "@/components/legal/legal-page";
import { KVKK_NOTICE_ENABLED } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | DersDevam",
  description: "DersDevam kapsamında işlenen kişisel verilere ilişkin aydınlatma metni.",
};

const listClass = "list-disc space-y-2 pl-5 marker:text-emerald-700";

export default function KvkkPage() {
  if (!KVKK_NOTICE_ENABLED) notFound();

  return (
    <LegalPage
      title="KVKK Aydınlatma Metni"
      summary="DersDevam’ı kullanırken hangi kişisel verilerin, hangi amaçlarla ve hangi güvenlik ihtiyaçları için işlendiğini açıklar. Bu metin açık rıza beyanı değildir."
      sections={[
        {
          id: "veri-sorumlusu",
          title: "Veri sorumlusu",
          content: (
            <div className="space-y-3">
              <p>DersDevam hizmetini sunan ve verilerin işlenme amaçları ile araçlarını belirleyen kurum veri sorumlusudur.</p>
              <p><strong>Yayın öncesi tamamlanacak:</strong> Kurumun resmî unvanı, açık adresi, KEP adresi ve KVKK başvuru e-posta adresi.</p>
            </div>
          ),
        },
        {
          id: "veri-kategorileri",
          title: "İşlenen veri kategorileri",
          content: (
            <ul className={listClass}>
              <li><strong>Kimlik ve hesap:</strong> ad soyad, e-posta adresi, öğrenci numarası, kullanıcı rolü, Google hesap tanımlayıcısı ve profil fotoğrafı.</li>
              <li><strong>Eğitim ve yoklama:</strong> ders kayıtları, öğrenci listeleri, yoklama zamanı, katılım durumu, manuel düzeltmeler ve rapor bilgileri.</li>
              <li><strong>Konum ve ağ:</strong> yalnızca yoklama doğrulaması sırasında paylaşılan konum, IP adresi ve okul ağı doğrulama sonucu.</li>
              <li><strong>Cihaz ve güvenlik:</strong> rastgele oluşturulan cihaz tanımlayıcısının güvenli özeti, oturum bilgileri, denetim kayıtları ve başarısız giriş/tarama denemeleri.</li>
              <li><strong>Destek:</strong> hata bildiriminin konusu, açıklaması, eklenen ekran görüntüsü ve yetkili yanıtları.</li>
            </ul>
          ),
        },
        {
          id: "amaclar",
          title: "İşleme amaçları",
          content: (
            <ul className={listClass}>
              <li>Kullanıcı hesabını ve rolünü doğrulamak.</li>
              <li>Öğrencinin doğru ders, okul ağı, sınıf konumu ve cihaz koşullarında yoklamaya katıldığını denetlemek.</li>
              <li>Ders katılım kayıtlarını oluşturmak, öğretim elemanına göstermek ve raporlamak.</li>
              <li>Yetkisiz erişimi, mükerrer katılımı ve kötüye kullanımı önlemek.</li>
              <li>Teknik sorunları incelemek ve kullanıcı desteği sağlamak.</li>
            </ul>
          ),
        },
        {
          id: "yontem-hukuki-sebep",
          title: "Toplama yöntemi ve hukuki sebep",
          content: (
            <div className="space-y-3">
              <p>Veriler; giriş formları, Google OAuth, öğretim elemanının yüklediği ders listeleri, QR tarama işlemi, tarayıcı izinleri, güvenlik günlükleri ve destek formları üzerinden elektronik olarak elde edilir.</p>
              <p>Her veri faaliyeti için uygulanacak KVKK m.5 ve gerekiyorsa m.6 işleme şartı; kurumun hukuki statüsü, hizmet ilişkisi ve iç mevzuatı dikkate alınarak veri sorumlusu tarafından ayrı ayrı belirlenmelidir. Açık rızaya dayanmayan işlemler için kullanıcıdan açık rıza istenmez.</p>
            </div>
          ),
        },
        {
          id: "aktarim",
          title: "Verilerin paylaşılması",
          content: (
            <p>Veriler, görev ve yetki sınırları içinde ilgili öğretim elemanları, sistem yöneticileri ve yetkili kurum birimleriyle paylaşılabilir. Sunucu/barındırma ve kimlik doğrulama hizmeti sağlayan tedarikçiler yalnızca hizmetin yürütülmesi için gerekli ölçüde veri işleyebilir. Alıcı grupları ve varsa yurt dışı aktarım mekanizması yayın öncesi doğrulanmalıdır.</p>
          ),
        },
        {
          id: "saklama-guvenlik",
          title: "Saklama ve güvenlik",
          content: (
            <div className="space-y-3">
              <p>Veriler yalnızca işleme amacının gerektirdiği süre ve uygulanabilir mevzuattaki saklama yükümlülükleri boyunca tutulmalıdır. Kesin saklama ve imha süreleri kurum politikasıyla ilan edilmelidir.</p>
              <p>Oturum ve cihaz çerezleri HttpOnly, Secure ve SameSite gibi korumalarla sınırlandırılır; parolalar tek yönlü olarak özetlenir; yetki kontrolleri ve denetim kayıtları tutulur.</p>
            </div>
          ),
        },
        {
          id: "haklar",
          title: "KVKK kapsamındaki haklarınız",
          content: (
            <div className="space-y-3">
              <p>KVKK’nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarılan tarafları bilme, düzeltme veya silme isteme ve kanundaki diğer haklara sahipsiniz.</p>
              <p><strong>Yayın öncesi tamamlanacak:</strong> Başvuru yöntemi, posta/KEP adresi, e-posta adresi ve kimlik doğrulama gereklilikleri.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
