namespace codeup.supplier;

entity Kategoriler {
    @Common.Text: name
    @Common.TextArrangement: #TextOnly
    key code : String(50);
    name : localized String(50);
}

entity Durumlar {
    @Common.Text: name
    @Common.TextArrangement: #TextOnly
    key code : String(20);
    name : localized String(50);
}

entity Suppliers {
    key ID : UUID;
    
    // Kayıt Bilgileri
    email : String(100) @mandatory @Search.searchable: true;
    parola : String(255) @Search.searchable: false;
    
    // Başvuru Formu Alanları
    firmaAdi : String(100) @Search.searchable: true;
    ilgiliKisi : String(100) @Search.searchable: true;
    telefon : String(20) @Search.searchable: false;
    ulke : String(50) @Search.searchable: false;
    kategori : String(50) @Search.searchable: false;
    kategori_nav : Association to one Kategoriler on kategori_nav.code = kategori;
    vergiNo : String(50) @Search.searchable: false;
    webSitesi : String(100) @Search.searchable: false;
    adres : String(255) @Search.searchable: false;
    notlar : String(1000) @Search.searchable: false;
    
    // Sertifika (PDF) Yüklemesi - Media Data
    @Core.MediaType: mediaType
    sertifika : LargeBinary;
    @Core.IsMediaType: true
    mediaType : String;
    
    // Süreç Yönetimi
    durum : String(20) default 'Gönderildi' @Search.searchable: false;
    durum_nav : Association to one Durumlar on durum_nav.code = durum;
    gonderimTarihi : DateTime @cds.on.insert: $now;
    retGerekcesi : String(500);
    
    // UI Yönlendirme İpucu (Sanal Alan)
    virtual detayGoster : String(20);
}