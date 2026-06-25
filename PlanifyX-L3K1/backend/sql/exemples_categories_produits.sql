BEGIN;

INSERT INTO categorie (nom)
VALUES
    ('Informatique'),
    ('Téléphonie'),
    ('Audio'),
    ('Périphériques'),
    ('Accessoires')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO produit (
    categorie_id,
    nom,
    code_barre,
    description,
    sous_categorie,
    famille,
    prix_achat_ht,
    prix_vente_ht,
    taux_tva,
    stock_initial,
    quantite_stock,
    seuil_minimum,
    seuil_critique
)
VALUES
    (
        (SELECT id FROM categorie WHERE nom = 'Informatique'),
        'MacBook Pro 14',
        '3700123456789',
        'Ordinateur portable 14 pouces',
        'Ordinateurs portables',
        'Apple',
        1450.00,
        1899.00,
        20.00,
        8,
        8,
        2,
        1
    ),
    (
        (SELECT id FROM categorie WHERE nom = 'Téléphonie'),
        'iPhone 15',
        '3700123456796',
        'Smartphone 128 Go',
        'Smartphones',
        'Apple',
        720.00,
        969.00,
        20.00,
        12,
        12,
        3,
        1
    ),
    (
        (SELECT id FROM categorie WHERE nom = 'Audio'),
        'AirPods Pro 2',
        '3700123456802',
        'Écouteurs sans fil avec réduction de bruit',
        'Écouteurs',
        'Apple',
        180.00,
        279.00,
        20.00,
        20,
        20,
        5,
        2
    ),
    (
        (SELECT id FROM categorie WHERE nom = 'Périphériques'),
        'Logitech MX Master 3S',
        '3700123456819',
        'Souris sans fil ergonomique',
        'Souris',
        'Logitech',
        65.00,
        109.00,
        20.00,
        15,
        15,
        4,
        2
    ),
    (
        (SELECT id FROM categorie WHERE nom = 'Accessoires'),
        'Chargeur USB-C 65W',
        '3700123456826',
        'Chargeur secteur rapide USB-C',
        'Chargeurs',
        'Anker',
        22.00,
        39.90,
        20.00,
        25,
        25,
        6,
        3
    )
ON CONFLICT (code_barre) DO NOTHING;

COMMIT;
