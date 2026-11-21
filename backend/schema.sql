-- =====================================================================
--  New Road Indumentaria - Esquema + datos iniciales (demo)
--  Av. Aristóbulo del Valle 6127, Santa Fe Capital
--
--  Ejecutar:  mysql -u root -p < schema.sql
--        o:   npm run db:init   (desde backend/)
--
--  ATENCIÓN: borra y recrea la base newroad_db (es una base de demo).
-- =====================================================================

DROP DATABASE IF EXISTS newroad_db;
CREATE DATABASE newroad_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE newroad_db;

-- ---------------------------------------------------------------------
--  Productos
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(120)  NOT NULL,
  categoria    ENUM('Remeras','Buzos','Pantalones','Camperas','Accesorios') NOT NULL,
  descripcion  TEXT          NULL,
  precio       DECIMAL(12,2) NOT NULL,
  imagen_url   VARCHAR(500)  NOT NULL,
  destacado    TINYINT(1)    NOT NULL DEFAULT 0,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_productos_categoria (categoria),
  CONSTRAINT chk_productos_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Stock por talle  (U = talle único, para accesorios)
-- ---------------------------------------------------------------------
CREATE TABLE producto_talles (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id  INT UNSIGNED NOT NULL,
  talle        ENUM('S','M','L','XL','XXL','U') NOT NULL,
  stock        INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_producto_talle (producto_id, talle),
  CONSTRAINT fk_talles_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Pedidos (checkout por WhatsApp)
-- ---------------------------------------------------------------------
CREATE TABLE pedidos (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cliente_nombre  VARCHAR(120)  NOT NULL,
  localidad       VARCHAR(160)  NOT NULL,          -- Ciudad / Provincia
  tipo_entrega    ENUM('retiro','envio') NOT NULL,
  medio_pago      ENUM('efectivo','transferencia','tarjeta') NOT NULL,
  total           DECIMAL(12,2) NOT NULL,
  estado          ENUM('pendiente','confirmado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pedidos_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE pedido_items (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pedido_id        INT UNSIGNED  NOT NULL,
  producto_id      INT UNSIGNED  NULL,              -- NULL si luego se borra el producto
  nombre_producto  VARCHAR(120)  NOT NULL,          -- snapshot al momento de la compra
  talle            ENUM('S','M','L','XL','XXL','U') NOT NULL,
  cantidad         INT UNSIGNED  NOT NULL,
  precio_unitario  DECIMAL(12,2) NOT NULL,
  subtotal         DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_pedido (pedido_id),
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
--  SEED: catálogo urbano (precios en ARS)
-- =====================================================================
INSERT INTO productos (id, nombre, categoria, descripcion, precio, imagen_url, destacado) VALUES
(1,  'Remera Oversize Road Classic', 'Remeras',
     'Remera oversize de algodón peinado 24/1, calce amplio y hombro caído. Estampa minimalista en el pecho. Ideal para el día a día.',
     28900, 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&q=80&auto=format&fit=crop', 1),
(2,  'Remera Boxy Fit Blanca', 'Remeras',
     'Corte boxy, cuello reforzado y tela pesada que no transparenta. La básica que combina con todo.',
     26900, 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=900&q=80&auto=format&fit=crop', 0),
(3,  'Remera Skull Peace Negra', 'Remeras',
     'Remera negra con estampa frontal en serigrafía de alta densidad. Algodón 100%, calce regular.',
     29900, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=900&q=80&auto=format&fit=crop', 1),
(4,  'Remera Gráfica Original Arena', 'Remeras',
     'Color arena con gráfica XL en el frente. Tela suave, lavado enzimático y terminaciones de primera.',
     31900, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900&q=80&auto=format&fit=crop', 0),
(5,  'Buzo Hoodie Heavyweight Gris', 'Buzos',
     'Hoodie de frisa invisible 420 g, capucha doble y bolsillo canguro. Abrigado y con caída perfecta.',
     64900, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&q=80&auto=format&fit=crop', 1),
(6,  'Buzo Cuello Redondo Off White', 'Buzos',
     'Buzo crewneck en frisa peinada, puños y cintura con rib. Calce oversize unisex.',
     54900, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900&q=80&auto=format&fit=crop', 0),
(7,  'Buzo Hoodie Color Drop', 'Buzos',
     'Hoodie de temporada en colores plenos (rojo, azul y gris). Frisa pesada y costuras reforzadas.',
     62900, 'https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=900&q=80&auto=format&fit=crop', 0),
(8,  'Jean Baggy Wash', 'Pantalones',
     'Jean de calce baggy, tiro medio y pierna amplia. Denim rígido 14 oz con lavado vintage.',
     62900, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=80&auto=format&fit=crop', 1),
(9,  'Pantalón Recto Gabardina Negro', 'Pantalones',
     'Gabardina elastizada de corte recto. Va de una salida a un día de laburo sin problema.',
     54900, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=900&q=80&auto=format&fit=crop', 0),
(10, 'Campera Biker Eco-Cuero', 'Camperas',
     'Campera biker en eco-cuero premium con cierres metálicos y forro interior. Un clásico que no falla.',
     129900, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&q=80&auto=format&fit=crop', 1),
(11, 'Campera Bomber Terracota', 'Camperas',
     'Bomber liviana de nylon con bolsillo utilitario en la manga. Ideal para media estación.',
     89900, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=80&auto=format&fit=crop', 0),
(12, 'Campera de Jean Raw Denim', 'Camperas',
     'Campera de jean crudo con cuello de corderoy. Envejece con vos y queda cada vez mejor.',
     99900, 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=900&q=80&auto=format&fit=crop', 0),
(13, 'Gorra Trucker New Road', 'Accesorios',
     'Gorra trucker con frente de espuma, red trasera y regulador snapback. Talle único.',
     18900, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=900&q=80&auto=format&fit=crop', 0),
(14, 'Mochila Urbana Navy', 'Accesorios',
     'Mochila de lona impermeable con compartimento acolchado para notebook de 15". Talle único.',
     45900, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80&auto=format&fit=crop', 0);

INSERT INTO producto_talles (producto_id, talle, stock) VALUES
(1,'S',6),(1,'M',10),(1,'L',8),(1,'XL',4),(1,'XXL',2),
(2,'S',5),(2,'M',12),(2,'L',9),(2,'XL',3),(2,'XXL',0),
(3,'S',0),(3,'M',4),(3,'L',6),(3,'XL',2),
(4,'M',3),(4,'L',5),(4,'XL',1),
(5,'S',3),(5,'M',7),(5,'L',6),(5,'XL',4),(5,'XXL',2),
(6,'S',4),(6,'M',6),(6,'L',0),(6,'XL',3),
(7,'M',5),(7,'L',5),(7,'XL',2),(7,'XXL',1),
(8,'S',2),(8,'M',6),(8,'L',7),(8,'XL',3),
(9,'S',3),(9,'M',5),(9,'L',4),(9,'XL',2),(9,'XXL',1),
(10,'S',1),(10,'M',3),(10,'L',2),(10,'XL',1),
(11,'M',4),(11,'L',3),(11,'XL',0),
(12,'S',2),(12,'M',3),(12,'L',3),(12,'XL',1),
(13,'U',20),
(14,'U',8);

-- Un pedido de ejemplo para que el panel admin no arranque vacío
INSERT INTO pedidos (id, cliente_nombre, localidad, tipo_entrega, medio_pago, total, estado) VALUES
(1, 'Lucía Fernández', 'Rosario, Santa Fe', 'envio', 'transferencia', 93800, 'confirmado');

INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, talle, cantidad, precio_unitario, subtotal) VALUES
(1, 5, 'Buzo Hoodie Heavyweight Gris', 'M', 1, 64900, 64900),
(1, 1, 'Remera Oversize Road Classic', 'L', 1, 28900, 28900);
