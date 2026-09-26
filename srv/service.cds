using codeup.supplier from '../db/schema';

service SupplierService {
    entity PortalSuppliers as projection on supplier.Suppliers;

    @readonly entity Kategoriler as projection on supplier.Kategoriler;
    @readonly entity Durumlar as projection on supplier.Durumlar;

    @requires: 'Approval'
    entity ApprovalSuppliers as projection on supplier.Suppliers actions {
        @cds.odata.bindingparameter.name: '_it'
        @Core.OperationAvailable: { $edmJson: { $Ne: [{ $Path: '_it/durum' }, 'Onaylandı'] } }
        action approve() returns ApprovalSuppliers;
        
        @cds.odata.bindingparameter.name: '_it'
        @Core.OperationAvailable: { $edmJson: { $Ne: [{ $Path: '_it/durum' }, 'Reddedildi'] } }
        action rejectSupplier(gerekce: String) returns ApprovalSuppliers;
        
        @cds.odata.bindingparameter.name: '_it'
        @Core.OperationAvailable: { $edmJson: { $And: [
            { $Ne: [{ $Path: '_it/durum' }, 'Onaylandı'] },
            { $Ne: [{ $Path: '_it/durum' }, 'Reddedildi'] }
        ]}}
        action analyzeCertificate() returns ApprovalSuppliers;
    };
    
    action loginSupplier(email: String, parola: String) returns String;
}

annotate SupplierService.ApprovalSuppliers with {
    firmaAdi @title: '{i18n>firmaAdi}' @UI.Importance: #High;
    ilgiliKisi @title: '{i18n>ilgiliKisi}' @UI.Importance: #High;
    email @title: '{i18n>email}' @UI.Importance: #High;
    durum @title: '{i18n>durum}' @UI.Importance: #High
          @Common.Text: durum_nav.name
          @Common.TextArrangement: #TextOnly
          @Common.ValueListWithFixedValues: true
          @Common.ValueList: {
              CollectionPath: 'Durumlar',
              Parameters: [
                  { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: durum, ValueListProperty: 'code' }
              ]
          };
    gonderimTarihi @title: '{i18n>tarih}' @UI.Importance: #High;
    ulke @title: '{i18n>ulke}';
    kategori @title: '{i18n>kategori}'
             @Common.Text: kategori_nav.name
             @Common.TextArrangement: #TextOnly
             @Common.ValueListWithFixedValues: true
             @Common.ValueList: {
                 CollectionPath: 'Kategoriler',
                 Parameters: [
                     { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: kategori, ValueListProperty: 'code' }
                 ]
             };
    telefon @title: '{i18n>telefon}';
    vergiNo @title: '{i18n>vergiNo}';
    adres @title: '{i18n>adres}';
    webSitesi @title: '{i18n>webSitesi}';
    notlar @title: '{i18n>notlar}';
    retGerekcesi @title: '{i18n>retGerekcesi}' @UI.HiddenFilter: true;
    detayGoster @title: '{i18n>detay}' @UI.Importance: #High;
    sertifika @title: '{i18n>sertifika}';
    
    // Hide system/technical fields from filters and UI
    ID @UI.HiddenFilter: true @UI.Hidden: true;
    parola @UI.HiddenFilter: true @UI.Hidden: true;
    sertifika @UI.HiddenFilter: true;
    mediaType @UI.HiddenFilter: true @UI.Hidden: true;
};

annotate SupplierService.ApprovalSuppliers with @(
    UI: {
        HeaderInfo: {
            TypeName: '{i18n>basvuru}',
            TypeNamePlural: '{i18n>basvurular}',
            Title: { Value: firmaAdi },
            Description: { Value: email }
        },
        Identification: [
            { $Type: 'UI.DataFieldForAction', Action: 'SupplierService.approve', Label: '{i18n>onayla}' },
            { $Type: 'UI.DataFieldForAction', Action: 'SupplierService.rejectSupplier', Label: '{i18n>reddet}' },
            { $Type: 'UI.DataFieldForAction', Action: 'SupplierService.analyzeCertificate', Label: '{i18n>aiAnaliz}' }
        ],
        LineItem: [
            { Value: firmaAdi },
            { Value: ilgiliKisi },
            { Value: email },
            { Value: gonderimTarihi },
            { Value: durum },
            { Value: detayGoster }
        ],
        Facets: [
            {
                $Type: 'UI.CollectionFacet',
                ID: 'GeneralInfo',
                Label: '{i18n>firmaVeIletisim}',
                Facets: [
                    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Main', Label: '{i18n>genelBilgiler}' },
                    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Contact', Label: '{i18n>iletisim}' }
                ]
            }
        ],
        FieldGroup #Main: {
            Data: [
                { Value: firmaAdi },
                { Value: vergiNo },
                { Value: kategori },
                { Value: durum },
                { Value: sertifika },
                { Value: retGerekcesi }
            ]
        },
        FieldGroup #Contact: {
            Data: [
                { Value: ilgiliKisi },
                { Value: email },
                { Value: telefon },
                { Value: ulke },
                { Value: adres },
                { Value: webSitesi },
                { Value: notlar }
            ]
        },
        PresentationVariant : {
            SortOrder: [ { Property: gonderimTarihi, Descending: true } ],
            Visualizations: [ '@UI.LineItem' ]
        },
        SelectionVariant #All : {
            Text: '{i18n>tumBasvurular}',
            SelectOptions: []
        },
        SelectionPresentationVariant #All : {
            Text: '{i18n>tumBasvurular}',
            SelectionVariant: { $Path: '@UI.SelectionVariant#All' },
            PresentationVariant: { $Path: '@UI.PresentationVariant' }
        },
        SelectionVariant #Pending : {
            Text: '{i18n>bekleyenler}',
            SelectOptions: [
                { PropertyName: durum, Ranges: [
                    { Sign: #I, Option: #EQ, Low: 'Gönderildi' },
                    { Sign: #I, Option: #EQ, Low: 'İncelemede' }
                ]}
            ]
        },
        SelectionPresentationVariant #Pending : {
            Text: '{i18n>bekleyenler}',
            SelectionVariant: { $Path: '@UI.SelectionVariant#Pending' },
            PresentationVariant: { $Path: '@UI.PresentationVariant' }
        },
        SelectionVariant #Approved : {
            Text: '{i18n>onaylananlar}',
            SelectOptions: [
                { PropertyName: durum, Ranges: [ { Sign: #I, Option: #EQ, Low: 'Onaylandı' } ] }
            ]
        },
        SelectionPresentationVariant #Approved : {
            Text: '{i18n>onaylananlar}',
            SelectionVariant: { $Path: '@UI.SelectionVariant#Approved' },
            PresentationVariant: { $Path: '@UI.PresentationVariant' }
        },
        SelectionVariant #Rejected : {
            Text: '{i18n>reddedilenler}',
            SelectOptions: [
                { PropertyName: durum, Ranges: [ { Sign: #I, Option: #EQ, Low: 'Reddedildi' } ] }
            ]
        },
        SelectionPresentationVariant #Rejected : {
            Text: '{i18n>reddedilenler}',
            SelectionVariant: { $Path: '@UI.SelectionVariant#Rejected' },
            PresentationVariant: { $Path: '@UI.PresentationVariant' }
        }
    }
);