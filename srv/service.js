const cds = require('@sap/cds');
const bcrypt = require('bcryptjs');

class SupplierService extends cds.ApplicationService {
    init() {
        const { PortalSuppliers, ApprovalSuppliers } = this.entities;

        this.before('CREATE', PortalSuppliers, async (req) => {
            const data = req.data;
            if (data.email) {
                const existing = await SELECT.one.from(PortalSuppliers).where({ email: data.email });
                if (existing) {
                    return req.reject(400, 'Bu e-posta adresi sistemde zaten kayıtlı. Lütfen farklı bir adres deneyin veya giriş yapın.');
                }
            }
            if (data.parola) {
                const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
                if (!strongPasswordRegex.test(data.parola)) {
                    return req.reject(400, 'Parola zayıf. Lütfen kurallara uyan bir parola girin.');
                }
                data.parola = await bcrypt.hash(data.parola, 10);
            }
            data.durum = 'Taslak';
        });

        this.before('UPDATE', PortalSuppliers, async (req) => {
            console.log('UPDATE PortalSuppliers', req.data);
            const data = req.data;
            if (data.firmaAdi !== undefined && !data.firmaAdi) return req.reject(400, 'Firma Adı zorunludur.');
            if (data.ilgiliKisi !== undefined && !data.ilgiliKisi) return req.reject(400, 'İlgili Kişi zorunludur.');

            const contentType = req.headers && req.headers['content-type'];
            if (contentType && data.sertifika) {
                if (contentType !== 'application/pdf') return req.reject(400, 'Sadece PDF dosyaları yüklenebilir.');
                const contentLength = req.headers['content-length'];
                if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) return req.reject(400, 'Dosya boyutu 10 MB sınırını aşamaz.');
            }

            if (data.durum === 'Gönderildi' || data.durum === 'İncelemede') {
                const supplierId = req.data.ID || req.params[0]?.ID || req.params[0];
                if (supplierId) {
                    const supplier = await SELECT.one.from(PortalSuppliers).where({ ID: supplierId });
                    if (supplier && !supplier.mediaType) return req.reject(400, 'Sertifika yüklemesi zorunludur.');
                }
            }
        });

        this.on('loginSupplier', async (req) => {
            const { email, parola } = req.data;
            if (!email || !parola) return req.reject(400, 'E-posta ve parola zorunludur.');
            const supplier = await SELECT.one.from(PortalSuppliers).where({ email: email });
            if (!supplier) return req.reject(400, 'Kullanıcı bulunamadı veya e-posta hatalı.');
            const isValid = await bcrypt.compare(parola, supplier.parola);
            if (!isValid) return req.reject(400, 'Hatalı parola.');
            return 'Giriş Başarılı';
        });

        this.on('approve', ApprovalSuppliers, async (req) => {
            const id = req.params[0]?.ID || req.params[0];
            await UPDATE(ApprovalSuppliers).set({ durum: 'Onaylandı', retGerekcesi: null }).where({ ID: id });
            return await SELECT.one.from(ApprovalSuppliers).where({ ID: id });
        });

        this.on('rejectSupplier', ApprovalSuppliers, async (req) => {
            const id = req.params[0]?.ID || req.params[0];
            const gerekce = req.data.gerekce;
            if (!gerekce || gerekce.trim() === '') {
                return req.reject(400, 'Red kararı vermek için mutlaka bir gerekçe (yorum) girmelisiniz.');
            }
            await UPDATE(ApprovalSuppliers).set({ durum: 'Reddedildi', retGerekcesi: gerekce }).where({ ID: id });
            return await SELECT.one.from(ApprovalSuppliers).where({ ID: id });
        });

        this.on('analyzeCertificate', ApprovalSuppliers, async (req) => {
            const id = req.params[0]?.ID || req.params[0];
            const supplier = await SELECT.one.from(ApprovalSuppliers).columns('*', 'sertifika').where({ ID: id });
            if (!supplier) return req.reject(404, 'Tedarikçi bulunamadı.');
            if (!supplier.sertifika) {
                return req.reject(400, 'Tedarikçi henüz bir sertifika yüklememiş. AI analizi yapılamıyor.');
            }

            try {
                // BTP Destination üzerinden dış AI servisine (Gemini) bağlanma.
                // API key ve kimlik bilgileri yalnızca GeminiAIDestination tanımında tutulur.
                // Kod sadece destination adını bilir; BTP production'da bu bir Destination Service instance'ı olur.
                const geminiSrv = await cds.connect.to('GeminiAIDestination');

                                let certBuffer;
                if (supplier.sertifika && typeof supplier.sertifika.on === 'function') {
                    // It's a Readable stream
                    const chunks = [];
                    for await (let chunk of supplier.sertifika) {
                        chunks.push(Buffer.from(chunk));
                    }
                    certBuffer = Buffer.concat(chunks);
                } else {
                    // It's a Uint8Array, Buffer, or String
                    certBuffer = Buffer.from(supplier.sertifika);
                }

                const documentPart = {
                    inlineData: {
                        data: certBuffer.toString('base64'),
                        mimeType: 'application/pdf'
                    }
                };

                const prompt = [
                    'Sen bir kurumsal tedarikçi onay uzmanısın. Ekteki PDF sertifikasını analiz et.',
                    'Eğer sertifika geçerli, eksiksiz ve kurumsal standartlara uygunsa "ONAY",',
                    'eğer şüpheli, eksik, süresi geçmiş veya kalitesiz görünüyorsa "RED" kararı ver.',
                    'Ayrıca kararının gerekçesini kısa ve net bir cümleyle belirt.',
                    'Yanıtını SADECE şu JSON formatında döndür, başka hiçbir şey ekleme:',
                    '{"karar": "ONAY", "gerekce": "..."} veya {"karar": "RED", "gerekce": "..."}'
                ].join('\n');

                const payload = {
                    contents: [{
                        parts: [
                            documentPart,
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                };

                // x-goog-api-key header'ı GeminiAIDestination credentials.headers üzerinden otomatik eklenir.
                                let response;
                let retries = 3;
                let delay = 1500;
                for (let i = 0; i < retries; i++) {
                    try {
                        response = await geminiSrv.send('POST', '/v1beta/models/gemini-3.8-flash:generateContent', payload);
                        break; // Başarılı olursa döngüden çık
                    } catch (err) {
                        if (i === retries - 1 || (!err.message.includes('high demand') && !err.message.includes('429'))) {
                            throw err; // Son denemeyse veya farklı bir hataysa fırlat
                        }
                        console.log(`Gemini API yoğunluk uyarısı (Deneme ${i+1}/${retries}). ${delay}ms bekleniyor...`);
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2; // Bekleme süresini katlayarak artır (Exponential Backoff)
                    }
                }

                const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!resultText) return req.reject(500, 'AI servisinden geçerli bir yanıt alınamadı.');

                const result = JSON.parse(resultText);

                let yeniDurum = 'İncelemede';
                if (result.karar === 'ONAY') yeniDurum = 'Onaylandı';
                if (result.karar === 'RED') yeniDurum = 'Reddedildi';

                const gerekce = result.gerekce || 'AI analizi tamamlandı.';
                await UPDATE(ApprovalSuppliers).set({
                    durum: yeniDurum,
                    retGerekcesi: `[AI Analizi] ${gerekce}`
                }).where({ ID: id });

                return await SELECT.one.from(ApprovalSuppliers).where({ ID: id });

            } catch (error) {
                console.error('AI Analysis error:', error);
                return req.reject(500, 'AI analizi sırasında bir hata oluştu: ' + error.message);
            }
        });

        this.after('READ', ApprovalSuppliers, (each) => {
            if (each) {
                if (Array.isArray(each)) {
                    each.forEach(row => { row.detayGoster = 'İncele 🔍'; });
                } else {
                    each.detayGoster = 'İncele 🔍';
                }
            }
        });

        return super.init();
    }
}
module.exports = SupplierService;
