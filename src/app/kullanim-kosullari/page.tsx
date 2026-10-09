import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Kullanım Koşulları | DersDevam",
  description: "DersDevam hizmetinin güvenli ve doğru kullanımına ilişkin koşullar.",
};

const listClass = "list-disc space-y-2 pl-5 marker:text-emerald-700";

export default function TermsPage() {
  return (
    <LegalPage
      title="Kullanım Koşulları"
      summary="DersDevam’ın yoklama ve ders yönetimi özelliklerini güvenli, doğru ve yetkili şekilde kullanmak için temel kuralları açıklar."
      sections={[
        {
          id: "kapsam",
          title: "Hizmetin kapsamı",
          content: <p>DersDevam; derslerin, öğrenci listelerinin ve katılım kayıtlarının yönetilmesini; QR kod, okul ağı, konum ve cihaz kontrolleriyle yoklamaya katılımın doğrulanmasını sağlar.</p>,
        },
        {
          id: "hesap",
          title: "Hesap güvenliği",
          content: (
            <ul className={listClass}>
              <li>Hesabınızı ve şifrenizi başka kişilerle paylaşmayın.</li>
              <li>Başkasının hesabıyla giriş yapmayın veya başkası adına QR kod okutmayın.</li>
              <li>Yetkisiz erişim şüphesini gecikmeden sistem yöneticisine bildirin.</li>
              <li>Ortak cihazlarda işlem bittikten sonra oturumu kapatın.</li>
            </ul>
          ),
        },
        {
          id: "yoklama",
          title: "Yoklamanın doğru kullanımı",
          content: (
            <ul className={listClass}>
              <li>Öğrenci yalnızca fiilen bulunduğu dersin aktif yoklamasına katılmalıdır.</li>
              <li>QR kodu, bağlantısı veya ekran görüntüsü sınıf dışındaki kişilerle paylaşılmamalıdır.</li>
              <li>VPN, konum yanıltma, cihaz kimliğini değiştirme veya benzeri yöntemlerle doğrulamayı aşmaya çalışmak yasaktır.</li>
              <li>Teknik hata hâlinde kullanıcı, ekranda görünen mesajı öğretim elemanına bildirmelidir.</li>
            </ul>
          ),
        },
        {
          id: "yetkiler",
          title: "Öğretim elemanı ve yönetici yetkileri",
          content: <p>Öğretim elemanları yalnızca sorumlu oldukları derslerin kayıtlarına; yöneticiler ise görevleri için gerekli sistem ve destek kayıtlarına erişmelidir. Manuel değişiklikler ve yönetim işlemleri denetim günlüğünde saklanabilir.</p>,
        },
        {
          id: "sureklilik",
          title: "Hizmet sürekliliği",
          content: <p>Bakım, ağ kesintisi, tarayıcı izinleri veya cihaz uyumsuzluğu nedeniyle hizmet geçici olarak kullanılamayabilir. Böyle bir durumda yoklama kararı ve alternatif kayıt yöntemi ilgili öğretim elemanı veya kurum yetkilisi tarafından belirlenir.</p>,
        },
        {
          id: "degisiklik",
          title: "Koşulların güncellenmesi",
          content: <p>Koşullar veya veri işleme uygulamaları önemli ölçüde değiştiğinde yeni sürüm tarihiyle yeniden bilgilendirme yapılır. Kullanıcının haklarını veya zorunluluklarını etkileyen değişiklikler ayrıca duyurulmalıdır.</p>,
        },
      ]}
    />
  );
}
