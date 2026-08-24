# MarketScope ER diagram

Preview this file in Cursor (Mermaid) or [mermaid.live](https://mermaid.live).

```mermaid
erDiagram
    direction LR
    COUNTRY ||--o{ STATE : contains
    STATE ||--o{ CITY : contains
    CITY ||--o{ MARKET : located_in
    PORTFOLIO_UPLOAD ||--|{ PORTFOLIO_STORE : has
    PORTFOLIO_UPLOAD ||--o{ MARKET : used_by
    MARKET ||--o{ MARKET_CATEGORY : selects
    CATEGORY ||--o{ MARKET_CATEGORY : mapped_in
    MARKET ||--o{ MARKET_PORTFOLIO_STORE : classifies
    PORTFOLIO_STORE ||--o{ MARKET_PORTFOLIO_STORE : classified_as
    MARKET ||--o{ DISCOVERED_STORE : finds

    COUNTRY {
        uuid id PK
        string name UK
    }
    STATE {
        uuid id PK
        string name
        uuid countryId FK
    }
    CITY {
        uuid id PK
        string name
        uuid stateId FK
    }
    CATEGORY {
        uuid id PK
        string name UK
        string googleType
    }
    PORTFOLIO_UPLOAD {
        uuid id PK
        string originalFilename
        int rowCount
        datetime createdAt
    }
    PORTFOLIO_STORE {
        uuid id PK
        uuid uploadId FK
        string storeName
        string address
        string category
        float latitude
        float longitude
        string geocodeStatus
    }
    MARKET {
        uuid id PK
        uuid portfolioUploadId FK
        uuid cityId FK
        float south
        float west
        float north
        float east
        float areaSqKm
        string status
    }
    MARKET_CATEGORY {
        uuid marketId PK
        uuid categoryId PK
    }
    MARKET_PORTFOLIO_STORE {
        uuid id PK
        uuid marketId FK
        uuid portfolioStoreId FK
        bool inBoundary
        float latitude
        float longitude
    }
    DISCOVERED_STORE {
        uuid id PK
        uuid marketId FK
        string placeId UK
        string name
        string category
        float latitude
        float longitude
    }
```

## How to explain it

- **COUNTRY / STATE / CITY** — location hierarchy with FKs; cascade dropdowns follow these relations.
- **CATEGORY** — seed labels + `googleType` for Places.
- **PORTFOLIO_UPLOAD / PORTFOLIO_STORE** — Step 1; lat/lng nullable.
- **MARKET** — Step 2 box (`south/west/north/east`, `areaSqKm` ≤ 30).
- **MARKET_PORTFOLIO_STORE.inBoundary** — uploaded pins inside vs outside the box.
- **DISCOVERED_STORE** — Google Places pins inside the box only.
