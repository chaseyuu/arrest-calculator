#!/usr/bin/env python3
"""
Builds data/gtaw-data/gtaw_penal_code.json from the GTA World Türkiye
"San Andreas Ceza Kanunu" (forum-tr.gta.world). Every value below was copied by
hand from the law text. Articles whose sub-clauses carry different penalties are
split into separate charges (e.g. 112a, 112b, 112c).

Time notation: "2g" = 2 gün, "6s" = 6 saat, "30d" = 30 dakika, combinable ("1g6s").
When the law gives only an upper limit ("X'ten fazla olmayacaktır") or only a
lower limit ("X'ten az olmayacaktır"), min and max are both set to X, the same
convention the original MDC Panel+ data uses.

Run:  python3 scripts/build-penal-code.py
"""
import json, re, pathlib

COURT = "(( Bu suç zorunlu olarak mahkemeye gidecektir. ))"
CK_COURT = "(( Character Kill (CK) olması durumunda zorunlu olarak mahkemeye gidecektir. ))"
IC_ONLY = ("(( Bu suç yalnızca IC amaçlarla Ceza Kanunu'nda yer almaktadır; sunucu kuralları "
           "gereği fiilen uygulanması veya kovuşturulması yasaktır. ))")
ADD_115 = "Kaçış motorlu taşıt veya bisikletle yapıldıysa 115. Kolluk Kuvvetlerinden Kaçmak ek suçlama olarak eklenir."
REPEAT = "Suçun devam etmesi halinde üçüncü cezaya dönülür ve ceza işlenmeye devam eder."

# Standard traffic infraction ladder: $2.500 / $5.000 / (2 gün bağlama, 3 gün askı, $7.500)
LADDER = dict(fine=[2500, 5000, 7500], impound=[0, 0, 2], susp=[0, 0, 3], extra=REPEAT)

def C(**kw):  # charge helper
    return kw

CHARGES = [
    # ---------------- BAŞLIK 0 - DEVLETİN EGEMENLİĞİNE KARŞI SUÇLAR
    C(id="001", name="İhanet", type="F", cls={"A": 0, "B": 0, "C": 0}, extra="Cezası mahkemenin takdirindedir. " + COURT),
    C(id="002", name="Casusluk", type="F", cls={"A": 0, "B": 0, "C": 0}, extra="Cezası mahkemenin takdirindedir. " + COURT),
    C(id="003", name="İç Terörizm", type="F", cls={"A": 0, "B": 0, "C": 0}, extra="Cezası mahkemenin takdirindedir. " + COURT),
    C(id="004", name="İç Terörizm Tehdidi", type="F", cls={"A": 0, "B": 0, "C": 0}, extra="Cezası mahkemenin takdirindedir. " + COURT),
    # ---------------- BAŞLIK I - KAMU BARIŞINA KARŞI SUÇLAR
    C(id="101", name="Vergi Kaçakçılığı", type="F", cls={"C": 2}, min="2g", max="5g", fine=[5000, 10000, 15000], extra=REPEAT),
    C(id="102", name="Seçimde Sahtekarlık", type="F", cls={"C": 2}, min="2g", max="5g"),
    C(id="103", name="Kamu Görevinde Yolsuzluk", type="F", cls={"C": 4}, min="4g", max="7g"),
    C(id="104", name="Kamu Görevini İhmal", type="F", cls={"B": 3, "C": 2}, min="3g", max="6g"),
    C(id="105", name="Kamu Görevlisine Rüşvet", type="F", cls={"C": 4}, min="3g", max="5g"),
    C(id="106", name="İsyana Teşvik", type="F", cls={"C": 2}, min="6s", max="2g"),
    C(id="107", name="Yasa Dışı Toplanma", type="M", cls={"C": 0}, min="3s", max="1g"),
    C(id="108", name="Delillerle Oynama", type="F", cls={"C": 5}, min="4s", max="4g"),
    C(id="109", name="Tanık veya Mağdura Tehdit", type="F", cls={"B": 5, "C": 3}, min="2g", max="7g"),
    C(id="110", name="Mahkemeye Saygısızlık", type="M", cls={"C": 0}, min="4g", max="4g", fine=[20000],
      extra="Hapis cezası en fazla 4 gün ve/veya para cezası en fazla $20.000'dır; duruma göre biri ya da ikisi uygulanabilir. "
            "(( Kefalet ihlali durumunda zorunlu olarak mahkemeye gidecektir. ))"),
    C(id="111", name="Yalancı Şahitlik", type="F", cls={"C": 3}, min="5s", max="3g"),
    C(id="112a", name="Kamu Görevini Engellemek (a)", type="F", cls={"A": 4}, min="2g", max="4g"),
    C(id="112b", name="Kamu Görevini Engellemek (b)", type="F", cls={"B": 3}, min="1g", max="2g"),
    C(id="112c", name="Kamu Görevini Engellemek (c)", type="M", cls={"C": 0}, min="12s", max="12s"),
    C(id="113a", name="Kolluk Kuvvetlerinde Görevli Hayvanı Engellemek (a)", type="M", cls={"B": 0}, min="12s", max="2g"),
    C(id="113b", name="Kolluk Kuvvetlerinde Görevli Hayvanı Engellemek (b)", type="M", cls={"B": 0}, min="2g", max="4g"),
    C(id="113c", name="Kolluk Kuvvetlerinde Görevli Hayvanı Engellemek (c)", type="F", cls={"A": 3}, min="3g", max="8g"),
    C(id="114", name="Yasal Gözaltından Kaçmak", type="F", cls={"C": 4}, min="7g", max="9g"),
    C(id="115", name="Kolluk Kuvvetlerinden Kaçmak", type="F", cls={"C": 4}, min="1g", max="5g",
      fine=[5000, 10000, 20000], impound=[7, 14, 14], susp=[7, 7, 7],
      extra="Sürücü lisansına 7 gün el koyulur. " + REPEAT + " Suç kişiye karşıdır; son kullanılan araç çekilebilir."),
    C(id="116", name="Tutuklamaya Direnmek", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="117", name="Hükümet Görevlilerine Yalan Söylemek", type="M", cls={"C": 0}, min="8s", max="4g", fine=[10000]),
    C(id="118", name="Acil Yardım Hatlarının Kötüye Kullanımı", type="M", cls={"C": 0}, min="1s", max="1g", fine=[5000]),
    C(id="119a", name="Kimlik Hırsızlığı (a)", type="M", cls={"C": 0}, min="4s", max="1g"),
    C(id="119b", name="Kimlik Hırsızlığı (b)", type="M", cls={"C": 0}, min="1g", max="4g", fine=[10000]),
    C(id="120", name="Bir Kamu Çalışanına Saldırı Tehdidi veya Darp", type="F", cls={"A": 5, "B": 4}, min="2g", max="6g"),
    C(id="121", name="Sahtecilik", type="M", cls={"C": 0}, min="6s", max="3g"),
    C(id="122a", name="Dolandırıcılık (a)", type="M", cls={"C": 0}, min="6s", max="2g"),
    C(id="122b", name="Dolandırıcılık (b) veya (c)", type="F", cls={"C": 2}, min="2g", max="4g"),
    C(id="123a", name="Para Aklamak ($10.000'a kadar)", type="F", cls={"C": 2}, min="2g", max="4g"),
    C(id="123b", name="Para Aklamak ($10.000 üzeri)", type="F", cls={"C": 3}, min="3g", max="5g"),
    C(id="123c", name="Para Aklamak ($100.000 üzeri)", type="F", cls={"C": 4}, min="3g", max="6g"),
    C(id="123d", name="Para Aklamak ($500.000 üzeri)", type="F", cls={"C": 5}, min="5g", max="8g"),
    C(id="123e", name="Para Aklamak ($1.000.000 üzeri)", type="F", cls={"C": 6}, min="6g", max="9g"),
    C(id="124", name="ABD Para Birimine Zarar Vermek", type="M", cls={"C": 0}, min="1g", max="2g"),
    C(id="125", name="Huzuru Bozmak", type="M", cls={"C": 0}, min="1s", max="1g", fine=[2500]),
    C(id="126", name="Haraç Kesmek", type="F", cls={"A": 6, "B": 5, "C": 4}, min="4g", max="8g"),
    C(id="127a", name="EFCE Yasasının İhlali - Sinyal Bozucu (a)", type="F", cls={"C": 6}, min="1g", max="3g"),
    C(id="127b", name="EFCE Yasasının İhlali - Sinyal Bozucu (b)", type="F", cls={"C": 4}, min="6s", max="1g"),
    C(id="127c", name="EFCE Yasasının İhlali - Sinyal Bozucu (c)", type="F", cls={"C": 4}, min="6s", max="1g"),
    C(id="128a", name="EFCE Yasasının İhlali - Kart Kopyalama (a)", type="F", cls={"C": 6}, min="1g", max="3g"),
    C(id="128b", name="EFCE Yasasının İhlali - Kart Kopyalama (b)", type="F", cls={"C": 4}, min="6s", max="1g"),
    C(id="128c", name="EFCE Yasasının İhlali - Kart Kopyalama (c)", type="F", cls={"C": 4}, min="6s", max="1g"),
    C(id="129", name="EFCE Yasasının İhlali - Araç Takibi", type="F", cls={"C": 6}, min="1g", max="3g"),
    C(id="130", name="Bir Mahkumu Kaçırmak", type="F", cls={"C": 4}, min="7g", max="9g"),
    C(id="131", name="Hapishane İçerisinde Uyuşturucu Madde Bulundurmak", type="F", cls={"C": 5},
      drugs={"A": (45000, "7g"), "B": (37500, "6g"), "C": (30000, "5g"), "D": (22500, "4g"), "T": (8000, "1g")},
      extra="Bulundurulan en yüksek kategori genel cezayı belirler. Para cezası tutarları azami değerlerdir."),
    C(id="132", name="Hapishane İçerisinde İletişim Aleti Bulundurmak", type="M", cls={"C": 0}, fine=[1000],
      extra="En fazla $1.000 para cezası."),
    C(id="133", name="Hapishane İçerisinde Tütün Bulundurmak", type="I", cls={"C": 0}, fine=[1000],
      extra="En fazla $1.000 para cezası."),
    C(id="134", name="Hapishane İçerisinde Yetkisiz Anahtar Bulundurmak", type="M", cls={"C": 0}, min="1s", max="1g", fine=[2500]),
    C(id="135", name="Barış Görevlisi Köpeğini Öldürmek", type="F", cls={"C": 4}, min="5g", max="6g"),
    C(id="136", name="Barış Görevlisi Köpeğini Ağır Yaralamak", type="F", cls={"C": 4}, min="2g", max="3g"),
    C(id="137", name="Barış Görevlisi Köpeğine Saldırmak", type="M", cls={"B": 0}, min="6s", max="1g", fine=[2500]),
    C(id="138", name="Barış Görevlisi Köpeğini Engelleme", type="M", cls={"C": 0}, min="50d", max="6s", fine=[2500]),
    C(id="139", name="Mobil Veri Bilgisayarının Kötüye Kullanımı", type="F", cls={"B": 3, "C": 2}, min="3g", max="6g"),
    C(id="140", name="Mobil Veri Bilgisayarından Yetkisiz Bilgi Paylaşımı", type="F", cls={"B": 2, "C": 3}, min="4g", max="8g"),
    C(id="141", name="Mahkumla Yasa Dışı İletişim Kurmak", type="M", cls={"C": 0}, min="18s", max="3g"),
    C(id="142a", name="Mahkemeye Katılmamak (Misdemeanor)", type="M", cls={"C": 0}, min="2g", max="2g", extra=COURT),
    C(id="142b", name="Mahkemeye Katılmamak (Felony)", type="F", cls={"C": 0}, min="6g", max="6g", extra=COURT),
    # ---------------- BAŞLIK II - KİŞİYE KARŞI SUÇLAR
    C(id="201", name="Cinayet", type="F", cls={"A": 18}, min="20g", max="20g", extra="Hapis cezası 20 günden az olamaz. " + CK_COURT),
    C(id="202", name="Birinci Derece Cinayet", type="F", cls={"A": 15}, min="18g", max="18g", extra="Hapis cezası 18 günden az olamaz. " + CK_COURT),
    C(id="203", name="İkinci Derece Cinayet", type="F", cls={"A": 10}, min="15g", max="15g", extra="Hapis cezası 15 günden az olamaz. " + CK_COURT),
    C(id="204", name="Kasten Adam Öldürme", type="F", cls={"A": 7}, min="5g", max="10g"),
    C(id="205", name="Kasıtsız Adam Öldürme", type="F", cls={"A": 5}, min="3g", max="8g"),
    C(id="206", name="Saldırı", type="M", cls={"B": 0}, min="3s", max="2g"),
    C(id="207a", name="Ölümcül Silahla Saldırı (a)", type="F", cls={"B": 3}, min="3g", max="5g"),
    C(id="207b", name="Ölümcül Silahla Saldırı (b)", type="F", cls={"B": 4}, min="4g", max="8g"),
    C(id="208", name="Darp", type="M", cls={"B": 0}, min="7s", max="3g"),
    C(id="209a", name="Ağırlaştırılmış Darp (a)", type="F", cls={"B": 6}, min="4g", max="6g"),
    C(id="209b", name="Ağırlaştırılmış Darp (b)", type="F", cls={"B": 8}, min="5g", max="9g"),
    C(id="210", name="Kaçırma", type="F", cls={"B": 7}, min="5g", max="5g", extra="Hapis cezası 5 günden az olamaz."),
    C(id="211", name="İnsan Kaçakçılığı", type="F", cls={"A": 9}, min="6g", max="6g", extra="Hapis cezası 6 günden az olamaz."),
    C(id="212", name="Yasa Dışı Hapis", type="M", cls={"B": 0}, min="2g", max="5g"),
    C(id="213", name="İşkence", type="F", cls={"A": 10}, min="6g", max="6g", extra="Hapis cezası 6 günden az olamaz."),
    C(id="214", name="Tehdit Suçu", type="M", cls={"B": 0}, min="3s", max="1g"),
    C(id="215", name="Soygun", type="F", cls={"B": 4}, min="2g", max="4g"),
    C(id="216", name="Silahlı Soygun", type="F", cls={"B": 5}, min="4g", max="8g"),
    C(id="217", name="Tecavüz", type="F", cls={"C": 3}, min="2g", max="5g", extra=IC_ONLY),
    C(id="218", name="Reşit Olmayanla Cinsel İlişki", type="F", cls={"A": 5}, min="4g", max="4g", extra="Hapis cezası 4 günden az olamaz. " + IC_ONLY),
    C(id="219", name="Cinsel Saldırı", type="F", cls={"B": 4}, min="3g", max="8g"),
    C(id="220", name="Taciz", type="M", cls={"C": 0}, min="6s", max="2g"),
    C(id="221", name="Aile İçi Şiddet", type="M", cls={"C": 0}, min="6s", max="2g"),
    C(id="222", name="Yakıcı Kimyasal Maddelerle Saldırı", type="F", cls={"B": 6}, min="4g", max="8g"),
    # ---------------- BAŞLIK III - MAL VARLIĞINA KARŞI SUÇLAR
    C(id="301", name="Kundakçılık", type="F", cls={"A": 5}, min="7g", max="7g", extra="Hapis cezası 7 günden az olamaz. " + COURT),
    C(id="302", name="Hırsızlık", type="F", cls={"C": 3}, min="2g", max="4g"),
    C(id="303", name="Haneye Tecavüz", type="F", cls={"C": 4}, min="4g", max="8g"),
    C(id="304", name="Büyük Çaplı Hırsızlık", type="F", cls={"C": 2}, min="4s", max="2g"),
    C(id="305", name="Küçük Çaplı Hırsızlık", type="M", cls={"C": 0}, min="2s", max="1g"),
    C(id="306", name="Araç Hırsızlığı", type="F", cls={"C": 4}, min="2g", max="6g"),
    C(id="307", name="Ateşli Silah Hırsızlığı", type="F", cls={"C": 3}, min="2g", max="5g"),
    C(id="308", name="Hırsızlık Aletlerinin Bulundurulması", type="M", cls={"C": 0}, min="1s", max="1g"),
    C(id="309", name="Çalınan Mal Varlığının Alınması", type="M", cls={"C": 0}, min="3s", max="2g"),
    C(id="310", name="İzinsiz Giriş", type="M", cls={"C": 0}, min="1s", max="2g"),
    C(id="311", name="Vandalizm", type="M", cls={"C": 0}, min="1s", max="2g", fine=[2500]),
    C(id="312a", name="Zimmetine Geçirme ($30.000'a kadar)", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="312b", name="Zimmetine Geçirme ($30.000 üzeri)", type="F", cls={"C": 2}, min="1g", max="3g"),
    C(id="313a", name="Taşıt Tescil Hırsızlığı (a)", type="M", cls={"C": 0}, min="3s", max="1g"),
    C(id="313b", name="Taşıt Tescil Hırsızlığı (b)", type="M", cls={"C": 0}, min="12s", max="2g"),
    C(id="313c", name="Taşıt Tescil Hırsızlığı (c)", type="F", cls={"C": 3}, min="1g", max="3g", extra=ADD_115),
    C(id="314a", name="Hapishane Mülküne Zarar Verme ($950'a kadar)", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="314b", name="Hapishane Mülküne Zarar Verme ($950 üzeri)", type="F", cls={"C": 2}, min="1g", max="3g"),
    # ---------------- BAŞLIK IV - TAŞITLARLA İŞLENEN SUÇLAR
    C(id="401", name="Geçerli Bir Sürücü Lisansı Olmadan Araç Kullanma", type="M", cls={"C": 0}, min="30d", max="1g", fine=[2500], impound=[1]),
    C(id="402", name="Askıya Alınmış Bir Sürücü Lisansıyla Araç Kullanma", type="M", cls={"C": 0}, min="45d", max="1g", fine=[5000], impound=[2]),
    C(id="403", name="Sürücü Lisansı İbraz Etmemek", type="I", cls={"C": 0}, fine=[1000]),
    C(id="404", name="Taşıt Tescil Belgesi İbraz Etmemek", type="I", cls={"C": 0}, fine=[1000]),
    C(id="405", name="Taşıt Sigorta Belgesi İbraz Etmemek", type="I", cls={"C": 0}, fine=[1000]),
    C(id="406a", name="Kayıtsız Taşıt (a)", type="I", cls={"C": 0}, fine=[5000], impound=[1], susp=[3]),
    C(id="406b", name="Kayıtsız Taşıt (b)", type="I", cls={"C": 0}, fine=[5000], impound=[1]),
    C(id="407a", name="Sigortasız Taşıt (a)", type="I", cls={"C": 0}, fine=[5000], impound=[1], susp=[3]),
    C(id="407b", name="Sigortasız Taşıt (b)", type="I", cls={"C": 0}, fine=[5000], impound=[1]),
    C(id="408a", name="Vur Kaç (a)", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="408b", name="Vur Kaç (b)", type="F", cls={"A": 4, "B": 3}, min="12s", max="3g"),
    C(id="409", name="Bir Arazi veya Deniz Aracının Dikkatsiz Kullanımı", type="M", cls={"C": 0}, min="1s", max="1g",
      fine=[2500, 5000, 15000], impound=[0, 0, 7], susp=[0, 0, 3], extra=REPEAT + " Ceza artırımlarına izin verilir."),
    C(id="410", name="Hız İhlali", type="I", cls={"C": 0}, fine=[2500, 5000, 8000], impound=[0, 0, 2], susp=[0, 0, 3], extra=REPEAT),
    C(id="411", name="Aşırı Hız İhlali", type="I", cls={"C": 0}, fine=[8000, 8000, 12000, 15000, 20000],
      impound=[0, 1, 3, 7, 10], susp=[0, 2, 4, 7, 10],
      extra="410. maddedeki azami hız sınırının 30 MPH veya daha fazla üzerinde seyretmek."),
    C(id="412", name="Trafik Kontrol Araçlarına Uymama", type="I", cls={"C": 0}, **LADDER),
    C(id="413", name="Kavşakta Yol Vermeme", type="I", cls={"C": 0}, **LADDER),
    C(id="414", name="Trafiğe Girişte Yol Vermeme", type="I", cls={"C": 0}, **LADDER),
    C(id="415", name="Yaya Geçidinde Yol Vermeme", type="I", cls={"C": 0}, **LADDER),
    C(id="416", name="Acil Durum Araçlarına Yol Vermeme", type="I", cls={"C": 0}, **LADDER),
    C(id="417", name="Dönüşte Hatalı Şeride Girme", type="I", cls={"C": 0}, **LADDER),
    C(id="418", name="Hatalı Park", type="I", cls={"C": 0}, fine=[1000, 2500, 5000],
      extra="Trafik akışını engelleyen veya halk için risk oluşturan araçlara 1 gün el koyulabilir."),
    C(id="419", name="Dikkatsiz Sürüş", type="M", cls={"C": 0}, min="1s", max="1g", fine=[5000], impound=[3], susp=[3]),
    C(id="420", name="Araç Tehlikesi", type="F", cls={"A": 4, "B": 3, "C": 2}, min="1g", max="5g", fine=[10000]),
    C(id="421", name="Farları Çalıştırmamak", type="I", cls={"C": 0}, fine=[2500]),
    C(id="422", name="Emniyetsiz Geri Manevra", type="I", cls={"C": 0}, **LADDER),
    C(id="423", name="Trafiği Engelleme", type="I", cls={"C": 0}, **LADDER),
    C(id="424", name="Ters Yönde Sürüş", type="I", cls={"C": 0}, **LADDER),
    C(id="425", name="Emniyetsiz Sürüş", type="I", cls={"C": 0}, **LADDER),
    C(id="426", name="Sürüş Sırasında Elektronik Cihaz Kullanma", type="I", cls={"C": 0}, **LADDER),
    C(id="427", name="Taşıt Gürültüsü", type="I", cls={"C": 0}, **LADDER),
    C(id="428", name="Hidroliklerin Yasa Dışı Kullanımı", type="I", cls={"C": 0}, **LADDER),
    C(id="429", name="Cam Filmleri", type="I", cls={"C": 0}, fine=[1000, 2500, 5000],
      extra=REPEAT + " (( Muafiyet yasaları değişmedikçe Level 1 ve 2 cam filmleri yasa dışıdır. ))"),
    C(id="430", name="Etki Altında Sürüş [DUI]", type="M", cls={"C": 0},
      time_by_offence=["3s", "6s", "1g"], points_by_offence=[0, 0, 2],
      fine=[5000, 8000, 12000], impound=[3, 7, 10], susp=[3, 7, 10],
      extra="3. suçta C Sınıfı (2) felony kapsamında sorumlu tutulur. " + REPEAT + " Ceza artırımlarına izin verilir."),
    C(id="431", name="Test Yapılmasını Reddetme", type="M", cls={"C": 0},
      time_by_offence=["3s", "6s", "1g"], points_by_offence=[0, 0, 2],
      fine=[5000, 8000, 12000], impound=[3, 7, 10], susp=[3, 7, 10],
      extra="3. suçta C Sınıfı (2) felony kapsamında sorumlu tutulur. " + REPEAT + " Ceza artırımlarına izin verilir."),
    C(id="432a", name="Motorlu Taşıt Yarışı (a)", type="M", cls={"C": 0}, min="1s", max="1g", fine=[5500], impound=[7], susp=[7]),
    C(id="432b", name="Motorlu Taşıt Yarışı (b)", type="F", cls={"C": 5}, min="1g", max="3g", fine=[15000], impound=[10], susp=[7],
      extra="115. Kolluk Kuvvetlerinden Kaçmak ek suçlama olarak eklenir."),
    C(id="433", name="Yaya Geçidi İhlali", type="I", cls={"C": 0}, fine=[1500]),
    C(id="434", name="Açık Materyal Bulundurma", type="I", cls={"C": 0}, fine=[1000]),
    C(id="435", name="Emniyet Kemeri — Emniyet Ekipmanı Kullanmama", type="I", cls={"C": 0}, fine=[1000]),
    C(id="436", name="Emniyetsiz Taşıtı Kullanma", type="I", cls={"C": 0}, fine=[2000], impound=[2]),
    C(id="437", name="Geçerli Bir Lisans Olmadan Hava Aracı Kullanma", type="M", cls={"C": 0}, min="2g", max="5g"),
    C(id="438", name="Hava Aracının Dikkatsiz Kullanımı", type="F", cls={"C": 3}, min="2g", max="6g", fine=[50000], impound=[3],
      extra="PPL (pilot lisansı) askıya alınır."),
    C(id="439", name="ATC Talimatlarına Uymamak", type="F", cls={"C": 2}, min="1s", max="1g", fine=[50000]),
    C(id="440", name="Hava Aracıyla Kaçma", type="F", cls={"C": 4}, min="2g", max="4g", fine=[100000], impound=[7]),
    C(id="441", name="Bisikletin Dikkatsiz Kullanımı", type="I", cls={"C": 0}, fine=[2500]),
    C(id="442", name="Vespucci Beach'te İzinsiz Taşıt Kullanımı", type="I", cls={"C": 0},
      fine=[2500, 5000, 7500], impound=[0, 0, 3], susp=[0, 0, 3], extra=REPEAT),
    C(id="443", name="Sokağı İşgal Etme", type="F", cls={"C": 5}, min="1g", max="3g", fine=[20000], impound=[7], susp=[7],
      extra="Taşıt veya bisikletle kaçarsa 115. Kolluk Kuvvetlerinden Kaçmak eklenir ve araca 14 gün el koyulur; "
            "yaya kaçarsa 116. Tutuklamaya Direnmek eklenir."),
    C(id="444", name="Araçlarda Işık Kontrolü", type="I", cls={"C": 0}, fine=[500, 2500, 7500], impound=[0, 0, 2], susp=[0, 0, 2],
      extra="3. suçta araçtaki ilgili ekipman iadesiz olarak sökülür. " + REPEAT),
    # ---------------- BAŞLIK V - KAMU AHLAKINA KARŞI SUÇLAR
    C(id="501", name="Teşhircilik", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="502", name="Kamu İçinde Uygunsuz veya Ahlaksız Davranış", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="503", name="Fuhuş", type="M", cls={"C": 0}, min="6s", max="1g"),
    C(id="504", name="Fuhuşa Teşvik", type="F", cls={"C": 2}, min="2g", max="4g"),
    C(id="505", name="Tacizci Takip", type="M", cls={"C": 0}, min="1g", max="3g"),
    C(id="506a", name="Kumar Dolandırıcılığı ($10.000'a kadar)", type="M", cls={"C": 0}, min="12s", max="1g"),
    C(id="506b", name="Kumar Dolandırıcılığı ($10.000 üzeri)", type="F", cls={"C": 2}, min="2g", max="4g"),
    C(id="507", name="Çocuk İstismarı", type="F", cls={"A": 7, "B": 5}, min="4g", max="8g"),
    C(id="508", name="Çocuk İhmali", type="F", cls={"A": 4, "B": 3}, min="2g", max="6g"),
    C(id="509", name="Reşit Olmayan Bireye Alkol veya Tütün Satışı", type="M", cls={"C": 0}, min="2s", max="2g"),
    C(id="510", name="Reşit Olmadan Alkol veya Tütün Kullanımı", type="M", cls={"C": 0}, min="1s", max="2g"),
    C(id="511", name="Hayvan İstismarı", type="F", cls={"A": 5, "B": 4}, min="2g", max="5g"),
    C(id="512", name="Mahkumla Cinsel İlişkiye Girme", type="F", cls={"C": 3}, min="2g", max="5g"),
    # ---------------- BAŞLIK VI - KAMU SAĞLIĞI & GÜVENLİĞİNE KARŞI SUÇLAR
    C(id="601", name="Kontrollü Madde Üretimi", type="F", cls={"C": 7},
      drugs={"A": (50000, "14g"), "B": (45000, "12g"), "C": (40000, "10g"), "D": (20000, "8g"), "T": (15000, "3g")},
      extra="Taşınan maddeler içinde en yüksek cezası olan kategori genel cezayı belirler. Para cezası tutarları azami değerlerdir."),
    C(id="602", name="Kontrollü Madde Bulundurmak", type="M", cls={"C": 0},
      drugs={"A": (4500, "20s"), "B": (3750, "15s"), "C": (3000, "10s"), "D": (2250, None), "T": (500, None)},
      extra="15 gramın altındaki miktarlar için. D ve T kategorilerinde hapis yerine yazılı veya sözlü uyarı verilir. "
            "CANA: D kategorisinde 5 gram ve altı, reçetesi üzerindeyse yasaldır. Para cezası tutarları azami değerlerdir."),
    C(id="603", name="Kontrollü Maddeyi Dağıtım Amacıyla Bulundurmak", type="M", cls={"C": 0},
      drugs={"A": (15000, "2g"), "B": (10500, "1g"), "C": (7000, "14s"), "D": (5250, "12s"), "T": (1000, "6s")},
      extra="Taşınan maddeler içinde en yüksek cezası olan kategori genel cezayı belirler. Para cezası tutarları azami değerlerdir."),
    C(id="604", name="Kontrollü Madde Satmak", type="F", cls={"C": 4},
      drugs={"A": (15000, "2g"), "B": (10500, "1g"), "C": (7000, "14s"), "D": (5250, "12s"), "T": (1000, "6s")},
      extra="Taşınan maddeler içinde en yüksek cezası olan kategori genel cezayı belirler. Para cezası tutarları azami değerlerdir."),
    C(id="605", name="Uyuşturucu Kaçakçılığı", type="F", cls={"C": 3},
      drugs={"A": (22500, "4g"), "B": (18750, "3g"), "C": (15000, "2g"), "D": (11500, "1g"), "T": (4000, "10s")},
      extra="Taşınan maddeler içinde en yüksek cezası olan kategori genel cezayı belirler. Para cezası tutarları azami değerlerdir."),
    C(id="606", name="Uyuşturucu Ticareti", type="F", cls={"C": 5},
      drugs={"A": (45000, "7g"), "B": (37500, "6g"), "C": (30000, "5g"), "D": (22500, "4g"), "T": (8000, "1g")},
      extra="Bulunan her 75 gram için cezaya 12 saat eklenir. Para cezası tutarları azami değerlerdir."),
    C(id="607a", name="Uyuşturucu Aletlerini Bulundurma", type="M", cls={"C": 0}, fine=[4500]),
    C(id="607b", name="Uyuşturucu Aletlerini Bulundurma (605/606 sırasında kullanıldıysa)", type="M", cls={"C": 0},
      min="1g", max="3g", fine=[4500]),
    C(id="609", name="Yasa Dışı Dinleme", type="F", cls={"C": 4}, min="2g", max="4g"),
    C(id="610", name="Yüzün Gizlenmesi", type="M", cls={"C": 0}, min="1s", max="2g"),
    C(id="611", name="Yangın Yönetmeliği İhlali", type="I", cls={"C": 0}, fine=[3000]),
    C(id="612", name="Çevrenin Kirletilmesi", type="I", cls={"C": 0}, fine=[1000]),
    C(id="613", name="SRCB İhlali", type="M", cls={"C": 0}, min="10s", max="10s", fine=[50000]),
    # ---------------- BAŞLIK VII - ATEŞLİ SİLAHLARA İLİŞKİN SUÇLAR
    C(id="701", name="İzinsiz Ateşli Silah Bulundurma", type="M", cls={"C": 0}, min="3s", max="4s"),
    C(id="702", name="Yasaklı Ateşli Silah Bulundurma", type="F", cls={"C": 4}, min="2g", max="6g"),
    C(id="703", name="Ağırlaştırılmış Silah Bulundurma", type="F", cls={"C": 5}, min="4g", max="10g"),
    C(id="704", name="Patlayıcı veya Yanıcı Cihazların Bulundurulması", type="F", cls={"C": 4}, min="4g", max="8g"),
    C(id="705", name="Yasal Olmayan Ateşli Silah ve Patlayıcı Maddelerin Satışı", type="F", cls={"C": 4}, min="2g", max="5g"),
    C(id="706", name="Ölümcül Silahın Sergilenmesi", type="F", cls={"B": 3}, min="1g", max="5g"),
    C(id="707", name="Ateşli Silahların Kamu Alanında Ateşlenmesi", type="F", cls={"C": 2}, min="2g", max="8g"),
    C(id="708", name="Silahla Motorlu Taşıttan Ateş Etmek", type="F", cls={"A": 7, "B": 5}, min="2g", max="5g"),
    C(id="709", name="Ateşli Silahların Dikkatsiz Kullanımı", type="M", cls={"B": 0, "C": 0}, min="6s", max="4g"),
    C(id="710", name="SHAFT İhlali", type="M", cls={"C": 0}, min="3s", max="2g"),
    C(id="711", name="Felony Hükümlüsünün Silah Bulundurması", type="F", cls={"C": 5}, min="1g", max="4g"),
    C(id="712", name="Felony Hükümlüsünün Mühimmat Bulundurması", type="F", cls={"C": 2}, min="1g", max="4g"),
    C(id="713", name="Hapishanede Ölümcül Silah Bulundurmak", type="F", cls={"C": 4}, min="7g", max="9g", extra=COURT),
    C(id="714a", name="Okul Sınırları İçerisinde Silah Bulundurmak (a)", type="F", cls={"C": 4}, min="2g", max="6g"),
    C(id="714b", name="Okul Sınırları İçerisinde Silah Bulundurmak (b)", type="M", cls={"C": 0}, min="1g", max="3g"),
    C(id="714c", name="Okul Sınırları İçerisinde Silah Bulundurmak (c)", type="F", cls={"C": 3}, min="2g", max="5g"),
]

ZERO = {"days": 0, "hours": 0, "min": 0}

def t(spec):
    if not spec:
        return dict(ZERO)
    out = dict(ZERO)
    for n, u in re.findall(r"(\d+)([gsd])", spec):
        out[{"g": "days", "s": "hours", "d": "min"}[u]] += int(n)
    return out

def build(c):
    n_off = max(len(c.get("fine", [0])), len(c.get("impound", [0])), len(c.get("susp", [0])),
                len(c.get("time_by_offence", [0])), 1)
    offs = [str(i) for i in range(1, max(n_off, 3) + 1)]
    def per_off(key):
        vals = c.get(key, [])
        return {o: (vals[i] if i < len(vals) else 0) for i, o in enumerate(offs)}
    entry = {
        "id": c["id"],
        "charge": c["name"],
        "type": c["type"],
        "class": {k: k in c["cls"] for k in "ABC"},
        "offence": {o: i < n_off for i, o in enumerate(offs)},
        "points": {k: c["cls"].get(k, 0) for k in "ABC"},
        "fine": per_off("fine"),
        "impound": per_off("impound"),
        "suspension": per_off("susp"),
        "extra": c.get("extra", "N/A"),
    }
    if "drugs" in c:
        cats = list(c["drugs"].keys())
        entry["drugs"] = {str(i + 1): k for i, k in enumerate(cats)}
        entry["time"] = {k: t(v[1]) for k, v in c["drugs"].items()}
        entry["maxtime"] = entry["time"]
        entry["fine"] = {k: v[0] for k, v in c["drugs"].items()}
    elif "time_by_offence" in c:
        tb = {o: t(c["time_by_offence"][i]) for i, o in enumerate(offs) if i < len(c["time_by_offence"])}
        entry["time"] = tb
        entry["maxtime"] = tb
        entry["time_by_offence"] = True
        pb = c["points_by_offence"]
        entry["points_by_offence"] = {o: pb[i] for i, o in enumerate(offs) if i < len(pb)}
    else:
        entry["time"] = t(c.get("min"))
        entry["maxtime"] = t(c.get("max") or c.get("min"))
    return entry

def sort_key(cid):
    m = re.match(r"(\d+)(.*)", cid)
    return (int(m.group(1)), m.group(2))

out = {}
seen = set()
for c in sorted(CHARGES, key=lambda c: sort_key(c["id"])):
    assert c["id"] not in seen, c["id"]
    seen.add(c["id"])
    out[c["id"]] = build(c)

root = pathlib.Path(__file__).resolve().parent.parent
dest = root / "data" / "gtaw-data" / "gtaw_penal_code.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(out)} charges -> {dest}")
