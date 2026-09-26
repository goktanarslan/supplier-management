sap.ui.define([
    'sap/fe/core/PageController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox'
], function(PageController, JSONModel, MessageBox) {
    'use strict';
    return PageController.extend('codeup.supplierportal.ext.view.Main', {

        onInit: function () {
            PageController.prototype.onInit.apply(this, arguments);

            var oStateModel = new JSONModel({
                isLoginVisible: true,
                isRegisterVisible: false,
                isAppVisible: false,
                isProcessVisible: false,
                isRejectedVisible: false,
                rejectReason: "",
                isReadOnly: false,
                
                rawPassword: "",
                passwordType: "Password",
                eyeIcon: "sap-icon://show",
                showRules: false,
                ruleLength: false,
                ruleUpper: false,
                ruleLower: false,
                ruleDigit: false,
                ruleSpecial: false,
                activeUserId: null,
                
                node1State: "Neutral", node1Focused: false, node1Children: ["2"],
                node2State: "Neutral", node2Focused: false, node2Children: ["3"],
                node3State: "Neutral", node3Focused: false
            });
            this.getView().setModel(oStateModel, "viewState");
        },

        // İhtiyaç duyduğumuzda i18n metinlerini kolayca çekmek için yardımcı fonksiyon
        _getI18nText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        },

        _updateProcessFlow: function (sDurum) {
            var oState = this.getView().getModel("viewState");
            
            oState.setProperty("/node1State", "Neutral"); oState.setProperty("/node1Focused", false);
            oState.setProperty("/node2State", "Neutral"); oState.setProperty("/node2Focused", false);
            oState.setProperty("/node3State", "Neutral"); oState.setProperty("/node3Focused", false);

            if (sDurum === "Gönderildi") {
                oState.setProperty("/node1State", "Positive");
                oState.setProperty("/node1Focused", true);
            } 
            else if (sDurum === "İncelemede") {
                oState.setProperty("/node1State", "Positive");
                oState.setProperty("/node2State", "Positive");
                oState.setProperty("/node2Focused", true);
            } 
            else if (sDurum === "Onaylandı") {
                oState.setProperty("/node1State", "Positive");
                oState.setProperty("/node2State", "Positive");
                oState.setProperty("/node3State", "Positive"); 
                oState.setProperty("/node3Focused", true);
            } 
            else if (sDurum === "Reddedildi") {
                oState.setProperty("/node1State", "Positive");
                oState.setProperty("/node2State", "Positive");
                oState.setProperty("/node3State", "Negative"); 
                oState.setProperty("/node3Focused", true);
            }
        },

        toggleView: function () {
            var oState = this.getView().getModel("viewState");
            var bLogin = oState.getProperty("/isLoginVisible");
            oState.setProperty("/isLoginVisible", !bLogin);
            oState.setProperty("/isRegisterVisible", bLogin);
        },

        onLogin: function () {
            var oView = this.getView();
            var sEmail = oView.byId("loginEmail").getValue();
            var sPassword = oView.byId("loginPassword").getValue();
            var that = this;

            if (!sEmail || !sPassword) {
                MessageBox.error(this._getI18nText("msgEmptyLogin"));
                return;
            }

            var oModel = oView.getModel();
            
            // Önce şifre kontrolü için loginSupplier eylemini çağır
            var oActionBinding = oModel.bindContext("/loginSupplier(...)");
            oActionBinding.setParameter("email", sEmail);
            oActionBinding.setParameter("parola", sPassword);

            oActionBinding.execute().then(function () {
                // ÃƒÂ…Ã‚Âifre doÃƒÂ„Ã…Â¸ruysa, kullanÃƒÂ„Ã‚Â±cÃƒÂ„Ã‚Â± bilgilerini ÃƒÂƒÃ‚Â§ek
                var oListBinding = oModel.bindList("/PortalSuppliers", undefined, undefined, undefined, { $filter: "email eq '" + sEmail + "'" });
                
                oListBinding.requestContexts(0, 1).then(function (aContexts) {
                    if (aContexts.length === 0) {
                        MessageBox.error(that._getI18nText("msgInvalidLogin"));
                    } else {
                        var oState = oView.getModel("viewState");
                        var oData = aContexts[0].getObject();
                        oState.setProperty("/activeUserId", oData.ID);
                        oState.setProperty("/supplierData", oData);
                        oState.setProperty("/isLoginVisible", false);
                        
                        var sDurum = oData.durum;
                        if (!oData.firmaAdi) {
                              oState.setProperty("/isAppVisible", true);
                          } else if (sDurum === "Gönderildi" || sDurum === "İncelemede" || sDurum === "Onaylandı" || sDurum === "Reddedildi") {
                            that._updateProcessFlow(sDurum);
                            oState.setProperty("/isProcessVisible", true);
                            
                            if (sDurum === "Reddedildi") {
                                oState.setProperty("/isRejectedVisible", true);
                                oState.setProperty("/rejectReason", oData.retGerekcesi || that._getI18nText("msgNoReason"));
                            }
                        } else {
                            oState.setProperty("/isAppVisible", true);
                        }
                    }
                }).catch(function(err){
                    MessageBox.error(that._getI18nText("msgLoginError") + err.message);
                });
            }).catch(function(err){
                // ÃƒÂ…Ã‚Âifre yanlÃƒÂ„Ã‚Â±ÃƒÂ…Ã…Â¸sa veya hata varsa
                MessageBox.error(that._getI18nText("msgInvalidLogin"));
            });
        },

        togglePasswordVisibility: function () {
            var oState = this.getView().getModel("viewState");
            var sCurrentType = oState.getProperty("/passwordType");
            if (sCurrentType === "Password") {
                oState.setProperty("/passwordType", "Text");
                oState.setProperty("/eyeIcon", "sap-icon://hide");
            } else {
                oState.setProperty("/passwordType", "Password");
                oState.setProperty("/eyeIcon", "sap-icon://show");
            }
        },

        onPasswordLiveChange: function (oEvent) {
            var sVal = oEvent.getParameter("value");
            var oState = this.getView().getModel("viewState");

            if (!sVal) {
                oState.setProperty("/showRules", false);
                return;
            }

            oState.setProperty("/showRules", true);
            oState.setProperty("/ruleLength", sVal.length >= 8);
            oState.setProperty("/ruleUpper", /[A-Z]/.test(sVal));
            oState.setProperty("/ruleLower", /[a-z]/.test(sVal));
            oState.setProperty("/ruleDigit", /\d/.test(sVal));
            oState.setProperty("/ruleSpecial", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sVal));
        },

        onFileTypeMismatch: function () {
            MessageBox.error(this._getI18nText("msgOnlyPDF"));
        },

        onFileSizeExceed: function () {
            MessageBox.error(this._getI18nText("msgMaxFile"));
        },

        onRegister: function () {
            var oView = this.getView();
            var oState = oView.getModel("viewState");
            var sEmail = oView.byId("regEmail").getValue();
            var sPassword = oState.getProperty("/rawPassword");
            var that = this;

            var bValid = oState.getProperty("/ruleLength") &&
                         oState.getProperty("/ruleUpper") &&
                         oState.getProperty("/ruleLower") &&
                         oState.getProperty("/ruleDigit") &&
                         oState.getProperty("/ruleSpecial");

            if (!sEmail || !bValid) {
                sap.ui.require(["sap/m/MessageBox"], function(MessageBoxHelper) {
                    MessageBoxHelper.error(that._getI18nText("msgValidEmailPassword"));
                });
                return;
            }

            var oModel = oView.getModel();
            var oCheckBinding = oModel.bindList("/PortalSuppliers", undefined, undefined, undefined, { $filter: "email eq '" + sEmail + "'" });
            
            oCheckBinding.requestContexts(0, 1).then(function (aContexts) {
                if (aContexts.length > 0) {
                    sap.ui.require(["sap/m/MessageBox"], function(MessageBoxHelper) {
                        MessageBoxHelper.error(that._getI18nText("msgEmailExists"));
                    });
                } else {
                    var oListBinding = oModel.bindList("/PortalSuppliers");
                    var oContext = oListBinding.create({
                        email: sEmail,
                        parola: sPassword
                    });

                    oContext.created().then(function () {
                        oState.setProperty("/activeUserId", oContext.getProperty("ID"));
                        oState.setProperty("/isRegisterVisible", false);
                        oState.setProperty("/isLoginVisible", false);
                        oState.setProperty("/isAppVisible", true);
                    }).catch(function (oError) {
                        if (oListBinding.resetChanges) oListBinding.resetChanges();
                        sap.ui.require(["sap/m/MessageBox"], function(MessageBoxHelper) {
                            MessageBoxHelper.error(that._getI18nText("msgRegError"));
                        });
                    });
                }
            }).catch(function(err){
                sap.ui.require(["sap/m/MessageBox"], function(MessageBoxHelper) {
                    MessageBoxHelper.error(that._getI18nText("msgServerError") + err.message);
                });
            });
        },

        onFinalSubmit: function () {
            var oView = this.getView();
            var oState = oView.getModel("viewState");
            var sId = oState.getProperty("/activeUserId");
            var that = this;

            var sFirma = oView.byId("appFirma").getValue();
            var sKisi = oView.byId("appKisi").getValue();
            var oFileUploader = oView.byId("fileUploader");

            if (!sFirma || !sKisi || !oFileUploader.getValue()) {
                MessageBox.error(this._getI18nText("msgRequiredFields"));
                return;
            }

            var payload = {
                firmaAdi: sFirma,
                ilgiliKisi: sKisi,
                telefon: oView.byId("appTelefon").getValue(),
                ulke: oView.byId("appUlke").getValue(),
                kategori: oView.byId("appKategori").getSelectedKey(),
                vergiNo: oView.byId("appVergiNo").getValue(),
                webSitesi: oView.byId("appWebsite").getValue(),
                adres: oView.byId("appAdres").getValue(),
                notlar: oView.byId("appNotlar").getValue(),
                durum: "Gönderildi"
            };

            var updateFlow = function() {
                that._updateProcessFlow("Gönderildi");
                oState.setProperty("/isAppVisible", false);
                oState.setProperty("/isProcessVisible", true);
                oState.setProperty("/isRejectedVisible", false);
            };

                        var domRef = oFileUploader.getFocusDomRef();
            var file = domRef.files[0];
            
            var sendPatch = function() {
                fetch("/odata/v4/supplier/PortalSuppliers(" + sId + ")", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    if (!res.ok) {
                        res.text().then(function(errTxt) { MessageBox.error("Hata: " + errTxt); });
                        return;
                    }
                    sap.ui.require(["sap/m/MessageToast"], function(MessageToast) {
                        MessageToast.show("Başvuru başarıyla Gönderildi!");
                    });
                    updateFlow();
                });
            };

            if (file) {
                fetch("/odata/v4/supplier/PortalSuppliers(" + sId + ")/sertifika", {
                    method: "PUT",
                    headers: { "Content-Type": "application/pdf" },
                    body: file
                }).then(function(res) {
                    if (!res.ok) {
                        res.text().then(function(errTxt) { MessageBox.error("Sertifika Yükleme Hatası: " + errTxt); });
                        return;
                    }
                    sendPatch();
                });
            } else {
                sendPatch();
            }
        },

                onReapply: function () {
            var oView = this.getView();
            var oState = oView.getModel("viewState");
            var oData = oState.getProperty("/supplierData");
            
            if (oData) {
                oView.byId("appFirma").setValue(oData.firmaAdi);
                oView.byId("appKisi").setValue(oData.ilgiliKisi);
                oView.byId("appTelefon").setValue(oData.telefon);
                oView.byId("appUlke").setValue(oData.ulke);
                oView.byId("appKategori").setSelectedKey(oData.kategori);
                oView.byId("appVergiNo").setValue(oData.vergiNo);
                oView.byId("appWebsite").setValue(oData.webSitesi);
                oView.byId("appAdres").setValue(oData.adres);
                oView.byId("appNotlar").setValue(oData.notlar);
            }

            oState.setProperty("/isProcessVisible", false);
            oState.setProperty("/isRejectedVisible", false);
            oState.setProperty("/isAppVisible", true);
            oState.setProperty("/isReadOnly", true); 
        }
    });
});



