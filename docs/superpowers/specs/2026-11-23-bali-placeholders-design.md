# Fictional Balinese Form Placeholders & Hints Design

- **Date:** 2026-11-23
- **Status:** Approved (Option 1 — *Bagus & Ayu* fictional Balinese persona; Approach 1 — direct inline updates)

## Goal
Remove all real personal data belonging to Adi & Eva (full names, parents, home addresses, wedding date, BNI account number `0700899045`, and slug `adi-eva`) plus non-Balinese examples (`Budi & Sari`) from every form `placeholder` and `hint` across `/order` and `/admin`, replacing them with a single cohesive fictional Balinese couple (*Bagus & Ayu* from Gianyar & Tabanan) without altering live routes or `/adi-eva` demo invitation data.

## Fictional Persona Used
- **Groom:** `I Putu Bagus Mahendra` (`Bagus`, IG `bagusmahendra`) — Putra pertama dari pasangan Bpk. I Wayan Sudarma & Ibu Ni Made Sariani, `Br. Tebongkang, Ubud, Gianyar`
- **Bride:** `Ni Kadek Ayu Pratiwi` (`Ayu`, IG `ayupratiwi`) — Putri kedua dari pasangan Bpk. I Ketut Wirawan & Ibu Ni Luh Suarningsih, `Br. Dauh Pala, Tabanan`
- **Mepandes:** `I Komang Aditya Mahendra` (`komangaditya`)
- **Event:** `Sabtu, 12 Desember 2026`, `Pukul 11.00 WITA – Selesai`, `Br. Tebongkang, Jl. Raya Singakerta No. 18, Ubud, Gianyar` (`2026-12-12T11:00:00+08:00`, expires `2027-12-12T00:00:00Z`)
- **Gift & Contact:** `I Putu Bagus Mahendra` / `1234567890`, slug `bagus-ayu`, pemesan `Bagus Mahendra`

## Files Updated
1. `src/components/order/OrderSteps.jsx`
2. `src/pages/AdminPage.jsx`
3. `src/components/admin/InvitationEditor.jsx`
4. `src/components/admin/ThemesManager.jsx`
