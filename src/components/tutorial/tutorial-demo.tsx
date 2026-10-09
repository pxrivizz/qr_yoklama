"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

import styles from "./tutorial-demo.module.css";

type Role = "student" | "teacher";
type Scene = "ready" | "login" | "profile" | "attendance" | "scan" | "success" | "course" | "settings" | "start" | "announce" | "live" | "report";

type TutorialStep = {
  title: string;
  description: string;
  note: string;
  scene: Scene;
};

const steps: Record<Role, TutorialStep[]> = {
  student: [
    {
      title: "Önce bağlantını hazırla",
      description: "Okulun Wi‑Fi ağına bağlan, VPN’i kapat ve tarayıcının kamera ile konum izinlerini aç.",
      note: "Yoklama, yalnızca doğru ağ ve sınıf konumu doğrulandığında çalışır.",
      scene: "ready",
    },
    {
      title: "Google hesabınla giriş yap",
      description: "Öğrenci sekmesini seç ve okulda kullandığın Google hesabıyla devam et.",
      note: "Kişisel hesabın kabul edilmezse okul e-posta adresinle yeniden dene.",
      scene: "login",
    },
    {
      title: "Profilini bir kez tamamla",
      description: "Öğrenci numaranı kontrol et ve yoklamada kullanılacak profil fotoğrafını ekle.",
      note: "Doğru bilgiler, öğretim elemanının katılımını hızla doğrulamasına yardım eder.",
      scene: "profile",
    },
    {
      title: "Açık yoklamayı bul",
      description: "Ana sayfadaki aktif ders bildiriminin içinden “Yoklamaya katıl” düğmesine dokun.",
      note: "Ders görünmüyorsa sayfayı yenile; yoklama henüz başlatılmamış olabilir.",
      scene: "attendance",
    },
    {
      title: "QR kodu çerçeveye al",
      description: "Kamerayı sınıftaki QR koda doğrult. Kodu büyütmene veya fotoğrafını çekmene gerek yok.",
      note: "Kamera açılmazsa izni kontrol et; ardından Chrome veya Safari ile yeniden dene.",
      scene: "scan",
    },
    {
      title: "Katılımın kaydedildi",
      description: "Yeşil onay ekranını gördüğünde işlem tamamdır. Aynı yoklamayı tekrar taramana gerek yok.",
      note: "Hata mesajı sürerse ekran görüntüsüyle birlikte öğretim elemanına bildir.",
      scene: "success",
    },
  ],
  teacher: [
    {
      title: "Dersini hazırlayarak başla",
      description: "Ders bilgilerini oluştur ve öğrenci listesini Excel dosyasından sisteme aktar.",
      note: "Listeyi dönem başında bir kez yükleyebilir, daha sonra tek tek düzenleyebilirsin.",
      scene: "course",
    },
    {
      title: "Sınıf koşullarını kontrol et",
      description: "Okul ağı ve sınıf konumu doğrulamasının dersin için doğru tanımlandığından emin ol.",
      note: "Bu iki kontrol, sınıf dışından katılımı engelleyen temel güvenlik katmanlarıdır.",
      scene: "settings",
    },
    {
      title: "Yoklamayı tek dokunuşla başlat",
      description: "Ders ekranından süreyi seç ve canlı QR kodu öğrencilerle paylaş.",
      note: "Kısa süreli ve yenilenen QR kod, ekran görüntüsüyle katılım riskini azaltır.",
      scene: "start",
    },
    {
      title: "Doğru koşulları sınıfa hatırlat",
      description: "Öğrencilerden okul Wi‑Fi’sine bağlanmalarını, VPN’i kapatmalarını ve izinleri açmalarını iste.",
      note: "Bu kısa kontrol listesi, dersteki teknik soruların büyük bölümünü önler.",
      scene: "announce",
    },
    {
      title: "Katılımı canlı izle",
      description: "Gelen öğrencileri anlık listede gör; sorun yaşayanları yoklama kapanmadan fark et.",
      note: "Şüpheli veya eksik kayıtları öğrenci ayrıntısından kontrol edebilirsin.",
      scene: "live",
    },
    {
      title: "Yoklamayı kapat ve raporla",
      description: "Süre sonunda yoklamayı kapat, gerekli düzeltmeleri yap ve sonucu Excel olarak indir.",
      note: "Kapanan yoklama korunur; sonradan yapılan değişiklikler sistem kaydında görünür.",
      scene: "report",
    },
  ],
};

const roleCopy: Record<Role, { label: string; icon: string; intro: string }> = {
  student: { label: "Öğrenci", icon: "school", intro: "Yoklamaya katılmayı 2 dakikada öğren." },
  teacher: { label: "Öğretim elemanı", icon: "co_present", intro: "Güvenli bir yoklamayı adım adım yönet." },
};

function ChecklistRow({ icon, title, detail, warning }: { icon: string; title: string; detail: string; warning?: boolean }) {
  return (
    <div className={styles.checkRow}>
      <span className={cn(styles.checkIcon, warning && styles.checkIconWarning)}>
        <MaterialIcon name={icon} className="text-[20px]" />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <MaterialIcon name="check_circle" filled className={cn("ml-auto text-[20px]", warning ? "text-[#e07825]" : "text-[#008b65]")} />
    </div>
  );
}

function FakeHeader({ title, back = false }: { title: string; back?: boolean }) {
  return (
    <div className={styles.fakeHeader}>
      {back ? <MaterialIcon name="arrow_back" className="text-[20px]" /> : <span className={styles.avatar}>HC</span>}
      <strong>{title}</strong>
      <MaterialIcon name="more_horiz" className="ml-auto text-[20px] text-[#777]" />
    </div>
  );
}

function QrPattern() {
  return (
    <svg viewBox="0 0 112 112" className={styles.qr} aria-label="Örnek QR kod">
      <rect width="112" height="112" rx="8" fill="white" />
      <g fill="#171717">
        <path d="M12 12h32v32H12zm7 7v18h18V19zM68 12h32v32H68zm7 7v18h18V19zM12 68h32v32H12zm7 7v18h18V75z" />
        <path d="M52 12h8v8h-8zM52 28h8v16h-8zM44 52h8v8h-8zM60 52h16v8H60zM84 52h16v8H84zM52 68h8v20h-8zM60 92h8v8h-8zM68 68h8v8h-8zM84 68h16v8H84zM76 76h8v16h-8zM92 84h8v16h-8z" />
      </g>
      <rect x="48" y="48" width="16" height="16" rx="4" fill="#6ffbbe" />
    </svg>
  );
}

function SceneVisual({ scene }: { scene: Scene }) {
  if (scene === "ready") {
    return (
      <div className={styles.phone}>
        <FakeHeader title="Hazırlık kontrolü" />
        <div className={styles.phoneBody}>
          <span className={styles.miniLabel}>Derse girmeden önce</span>
          <h3>Her şey hazır mı?</h3>
          <ChecklistRow icon="wifi" title="Okul Wi‑Fi’si" detail="Bağlantı güçlü" />
          <ChecklistRow icon="vpn_key_off" title="VPN kapalı" detail="Güvenli doğrulama için" warning />
          <ChecklistRow icon="location_on" title="Konum ve kamera" detail="İzin verildi" />
        </div>
      </div>
    );
  }

  if (scene === "login") {
    return (
      <div className={styles.phone}>
        <div className={styles.loginScene}>
          <BrandMark className="size-14" />
          <div><strong>DersDevam</strong><small>Öğrenci girişi</small></div>
          <button type="button"><span className={styles.googleG}>G</span> Google ile devam et</button>
          <p>Okul hesabını kullan</p>
        </div>
      </div>
    );
  }

  if (scene === "profile") {
    return (
      <div className={styles.phone}>
        <FakeHeader title="Profilini tamamla" back />
        <div className={styles.phoneBody}>
          <div className={styles.photoTarget}><MaterialIcon name="add_a_photo" /></div>
          <label className={styles.fakeField}><span>Öğrenci numarası</span><strong>220104001</strong></label>
          <label className={styles.fakeField}><span>Ad soyad</span><strong>Deniz Yılmaz</strong></label>
          <div className={styles.primaryFake}>Profili kaydet</div>
        </div>
      </div>
    );
  }

  if (scene === "attendance") {
    return (
      <div className={styles.phone}>
        <FakeHeader title="Bugünkü dersler" />
        <div className={styles.phoneBody}>
          <div className={styles.activeLesson}>
            <div className={styles.liveDot}>CANLI</div>
            <span>09:30 – B-204</span>
            <h3>Web Programlama</h3>
            <p>Yoklama 04:18 sonra kapanacak</p>
            <div className={styles.primaryFake}>Yoklamaya katıl</div>
          </div>
          <div className={styles.mutedLesson}><span>13:30</span><strong>Veri Yapıları</strong></div>
        </div>
      </div>
    );
  }

  if (scene === "scan") {
    return (
      <div className={cn(styles.phone, styles.darkPhone)}>
        <FakeHeader title="QR kodu tara" back />
        <div className={styles.scanner}>
          <div className={styles.scanFrame}><QrPattern /><span className={styles.scanLine} /></div>
          <h3>Kodu çerçeveye al</h3>
          <p>Bulunduğunda otomatik okunacak</p>
        </div>
      </div>
    );
  }

  if (scene === "success") {
    return (
      <div className={styles.phone}>
        <div className={styles.successScene}>
          <span className={styles.successIcon}><MaterialIcon name="done" className="text-[42px]" /></span>
          <h3>Katılımın kaydedildi</h3>
          <p>Web Programlama · 09:42</p>
          <div className={styles.receipt}><span>Bağlantı</span><strong>Okul ağı</strong><span>Konum</span><strong>Doğrulandı</strong></div>
          <div className={styles.primaryFake}>Ana sayfaya dön</div>
        </div>
      </div>
    );
  }

  if (scene === "course") {
    return (
      <div className={styles.dashboard}>
        <div className={styles.dashTop}><span className={styles.avatar}>GS</span><strong>Derslerim</strong><button type="button"><MaterialIcon name="add" /> Yeni ders</button></div>
        <div className={styles.courseHero}><span>2026 · Güz</span><h3>Web Programlama</h3><p>42 öğrenci</p></div>
        <div className={styles.importLine}><MaterialIcon name="upload_file" /><span><strong>Öğrenci listesi</strong><small>ogrenciler.xlsx · 42 kayıt</small></span><MaterialIcon name="check_circle" filled className="ml-auto text-[#008b65]" /></div>
      </div>
    );
  }

  if (scene === "settings") {
    return (
      <div className={styles.dashboard}>
        <FakeHeader title="Yoklama ayarları" back />
        <div className={styles.settingBody}>
          <div className={styles.mapBlock}><span className={styles.mapPin}><MaterialIcon name="school" /></span><i /><i /><i /></div>
          <ChecklistRow icon="router" title="Kampüs ağı" detail="MU-WiFi doğrulanacak" />
          <ChecklistRow icon="distance" title="Sınıf konumu" detail="B-204 · 35 metre" />
        </div>
      </div>
    );
  }

  if (scene === "start") {
    return (
      <div className={styles.dashboard}>
        <div className={styles.qrPresentation}>
          <div><span className={styles.liveDot}>YOKLAMA AÇIK</span><h3>Web Programlama</h3><p>B-204 · 05:00 dakika</p></div>
          <QrPattern />
        </div>
        <div className={styles.timerLine}><span>04:18</span><div><i /></div><button type="button">Yoklamayı kapat</button></div>
      </div>
    );
  }

  if (scene === "announce") {
    return (
      <div className={styles.boardScene}>
        <div className={styles.boardTitle}><span>3 adımda katıl</span><h3>Hazır. Tara. Tamamla.</h3></div>
        <div className={styles.announceSteps}>
          <span><b>1</b><MaterialIcon name="wifi" /><strong>Okul ağına bağlan</strong></span>
          <span><b>2</b><MaterialIcon name="vpn_key_off" /><strong>VPN’i kapat</strong></span>
          <span><b>3</b><MaterialIcon name="photo_camera" /><strong>Kamera iznini aç</strong></span>
        </div>
      </div>
    );
  }

  if (scene === "live") {
    return (
      <div className={styles.dashboard}>
        <div className={styles.liveHead}><div><span>CANLI YOKLAMA</span><h3>31 / 42 katıldı</h3></div><strong>03:12</strong></div>
        <div className={styles.progress}><i /></div>
        <div className={styles.studentRows}>
          {["Deniz Yılmaz", "Ece Kaya", "Mert Akın"].map((name, index) => <div key={name}><span className={styles.studentAvatar}>{name.split(" ").map((part) => part[0]).join("")}</span><strong>{name}</strong><small>{index === 2 ? "Şimdi" : `${index + 1} dk önce`}</small><MaterialIcon name="check_circle" filled /></div>)}
        </div>
        <div className={styles.newJoin}><MaterialIcon name="person_add" /> Mert Akın katıldı</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.reportTop}><div><span>YOKLAMA TAMAMLANDI</span><h3>Web Programlama</h3></div><span className={styles.successIcon}><MaterialIcon name="done" /></span></div>
      <div className={styles.reportStats}><span><strong>38</strong>Katıldı</span><span><strong>4</strong>Katılmadı</span><span><strong>%90</strong>Oran</span></div>
      <div className={styles.reportActions}><button type="button"><MaterialIcon name="edit" /> Kayıtları düzenle</button><button type="button"><MaterialIcon name="download" /> Excel indir</button></div>
    </div>
  );
}

export function TutorialDemo() {
  const [role, setRole] = useState<Role>("student");
  const [stepIndex, setStepIndex] = useState(0);
  const currentSteps = steps[role];
  const step = currentSteps[stepIndex];
  const isLast = stepIndex === currentSteps.length - 1;

  function selectRole(nextRole: Role) {
    setRole(nextRole);
    setStepIndex(0);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="DersDevam ana sayfa">
          <BrandMark className="size-10" priority />
          <span><strong>DersDevam</strong><small>Kullanım rehberi</small></span>
        </Link>
        <span className={styles.demoBadge}>PROTOTİP</span>
      </header>

      <section className={styles.shell}>
        <div className={styles.topLine}>
          <div>
            <h1>Sistemi birlikte keşfedelim.</h1>
            <p>{roleCopy[role].intro}</p>
          </div>
          <div className={styles.roleSwitch} aria-label="Rehber rolü">
            {(Object.keys(roleCopy) as Role[]).map((item) => (
              <button key={item} type="button" onClick={() => selectRole(item)} aria-pressed={role === item} className={role === item ? styles.roleActive : undefined}>
                <MaterialIcon name={roleCopy[item].icon} className="text-[20px]" />
                {roleCopy[item].label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.progressRail} aria-label={`${stepIndex + 1}. adım / ${currentSteps.length}`}>
          {currentSteps.map((item, index) => (
            <button key={item.title} type="button" onClick={() => setStepIndex(index)} className={cn(index === stepIndex && styles.progressActive, index < stepIndex && styles.progressDone)} aria-label={`${index + 1}. adıma git: ${item.title}`} aria-current={index === stepIndex ? "step" : undefined}>
              <span>{index < stepIndex ? <MaterialIcon name="done" className="text-[14px]" /> : index + 1}</span>
              <i />
            </button>
          ))}
        </div>

        <div className={styles.content} key={`${role}-${stepIndex}`}>
          <div className={styles.copy}>
            <span className={styles.stepNumber}>ADIM {String(stepIndex + 1).padStart(2, "0")} / {String(currentSteps.length).padStart(2, "0")}</span>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
            <div className={styles.note}><MaterialIcon name="tips_and_updates" /><span><strong>Neden önemli?</strong>{step.note}</span></div>
            <div className={styles.actions}>
              <button type="button" className={styles.nextButton} onClick={() => isLast ? setStepIndex(0) : setStepIndex((current) => current + 1)}>
                {isLast ? "Baştan izle" : "Sonraki adım"}
                <MaterialIcon name={isLast ? "replay" : "arrow_forward"} className="text-[20px]" />
              </button>
              {stepIndex > 0 && <button type="button" className={styles.backButton} onClick={() => setStepIndex((current) => current - 1)}>Geri</button>}
            </div>
          </div>

          <div className={styles.stage} aria-label={`${step.title} örnek ekranı`}>
            <div className={styles.stageGlow} />
            <span className={styles.stageTag}><MaterialIcon name="touch_app" className="text-[17px]" /> Ekranda böyle görünecek</span>
            <div className={styles.sceneWrap}><SceneVisual scene={step.scene} /></div>
            <span className={styles.stageHint}>{role === "student" ? "Telefon görünümü" : "Panel görünümü"}</span>
          </div>
        </div>

        <div className={styles.mobileActions}>
          <button type="button" className={styles.nextButton} onClick={() => isLast ? setStepIndex(0) : setStepIndex((current) => current + 1)}>{isLast ? "Baştan izle" : "Sonraki adım"}<MaterialIcon name={isLast ? "replay" : "arrow_forward"} /></button>
        </div>
      </section>
    </main>
  );
}
