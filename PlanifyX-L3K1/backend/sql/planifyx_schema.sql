BEGIN;

CREATE TABLE IF NOT EXISTS categorie (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS fournisseur (
    id BIGSERIAL PRIMARY KEY,
    nom_entreprise VARCHAR(255) NOT NULL,
    email_contact VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS client (
    id BIGSERIAL PRIMARY KEY,
    nom_complet VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_anniversaire DATE,
    points_fidelite INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT client_points_fidelite_non_negatifs CHECK (points_fidelite >= 0)
);

CREATE TABLE IF NOT EXISTS employe (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    salaire_base NUMERIC(12,2) NOT NULL,
    CONSTRAINT employe_salaire_base_non_negatif CHECK (salaire_base >= 0),
    CONSTRAINT employe_role_valide CHECK (role IN ('Admin', 'Vendeur', 'Manager', 'RH'))
);

CREATE TABLE IF NOT EXISTS produit (
    id BIGSERIAL PRIMARY KEY,
    categorie_id BIGINT NOT NULL,

    nom VARCHAR(255) NOT NULL,
    code_barre VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    sous_categorie VARCHAR(255),
    famille VARCHAR(255),

    prix_achat_ht NUMERIC(12,2) NOT NULL,
    prix_vente_ht NUMERIC(12,2) NOT NULL,
    taux_tva NUMERIC(5,2) NOT NULL DEFAULT 20.00,

    stock_initial INTEGER NOT NULL DEFAULT 0,
    quantite_stock INTEGER NOT NULL DEFAULT 0,
    seuil_minimum INTEGER NOT NULL DEFAULT 0,
    seuil_critique INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_produit_categorie
        FOREIGN KEY (categorie_id)
        REFERENCES categorie(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_prix_achat_ht CHECK (prix_achat_ht >= 0),
    CONSTRAINT chk_prix_vente_ht CHECK (prix_vente_ht >= 0),
    CONSTRAINT chk_taux_tva CHECK (taux_tva >= 0),
    CONSTRAINT chk_stock_initial CHECK (stock_initial >= 0),
    CONSTRAINT chk_quantite_stock CHECK (quantite_stock >= 0),
    CONSTRAINT chk_seuil_minimum CHECK (seuil_minimum >= 0),
    CONSTRAINT chk_seuil_critique CHECK (seuil_critique >= 0)
);

CREATE TABLE IF NOT EXISTS commande_pos (
    id BIGSERIAL PRIMARY KEY,
    employe_id BIGINT NOT NULL,
    client_id BIGINT NULL,
    date_creation TIMESTAMP NOT NULL,
    total_ttc NUMERIC(12,2) NOT NULL,
    mode_paiement VARCHAR(20) NOT NULL,
    CONSTRAINT commande_pos_total_ttc_non_negatif CHECK (total_ttc >= 0),
    CONSTRAINT commande_pos_mode_paiement_valide CHECK (mode_paiement IN ('Carte', 'Especes')),
    CONSTRAINT fk_commande_pos_employe
        FOREIGN KEY (employe_id)
        REFERENCES employe(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_commande_pos_client
        FOREIGN KEY (client_id)
        REFERENCES client(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ligne_commande (
    id BIGSERIAL PRIMARY KEY,
    commande_id BIGINT NOT NULL,
    produit_id BIGINT NOT NULL,
    quantite INTEGER NOT NULL,
    prix_applique NUMERIC(12,2) NOT NULL,
    CONSTRAINT ligne_commande_quantite_min_1 CHECK (quantite >= 1),
    CONSTRAINT ligne_commande_prix_applique_non_negatif CHECK (prix_applique >= 0),
    CONSTRAINT fk_ligne_commande_commande
        FOREIGN KEY (commande_id)
        REFERENCES commande_pos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ligne_commande_produit
        FOREIGN KEY (produit_id)
        REFERENCES produit(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS facture (
    id BIGSERIAL PRIMARY KEY,
    commande_id BIGINT NOT NULL UNIQUE,
    numero_facture VARCHAR(255) NOT NULL UNIQUE,
    statut VARCHAR(30) NOT NULL,
    CONSTRAINT facture_statut_valide CHECK (statut IN ('Emise', 'Payee', 'Annulee')),
    CONSTRAINT fk_facture_commande
        FOREIGN KEY (commande_id)
        REFERENCES commande_pos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_produit_categorie_id ON produit(categorie_id);
CREATE INDEX IF NOT EXISTS idx_commande_pos_employe_id ON commande_pos(employe_id);
CREATE INDEX IF NOT EXISTS idx_commande_pos_client_id ON commande_pos(client_id);
CREATE INDEX IF NOT EXISTS idx_ligne_commande_commande_id ON ligne_commande(commande_id);
CREATE INDEX IF NOT EXISTS idx_ligne_commande_produit_id ON ligne_commande(produit_id);
CREATE INDEX IF NOT EXISTS idx_facture_commande_id ON facture(commande_id);

COMMIT;
