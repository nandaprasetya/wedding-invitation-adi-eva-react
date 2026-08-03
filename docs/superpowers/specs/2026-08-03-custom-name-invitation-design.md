# Design Spec: Custom Name Invitation Generator (`/custom-name`)

## Context & Overview
The wedding invitation application requires a helper page at `/custom-name` where users can enter a guest's name ("Nama Tujuan") to generate a formatted text invitation message for WhatsApp sharing with a personalized link `https://anselmoments.com/adi-eva/?to={nama}`.

## Route & Component Structure
- **Route**: `/custom-name` added to `src/App.jsx`
- **Page Component**: `src/pages/CustomName.jsx`
- **CSS Stylesheet**: `src/styles/custom-name.css`

## Key Requirements & UI Flow
1. **Header & Card Layout**: Clean container box with subtle borders and shadows matching modern web standards and screenshot visuals.
2. **Form Section ("Bagikan Undangan")**:
   - Input prefix/label: "Nama Tujuan"
   - Text input for recipient's name
   - "Lanjutkan" button (Green)
3. **Detail Section ("Detail Undangan")**:
   - Displayed after "Lanjutkan" is pressed.
   - **"Copy Data" Button**: Copies generated invitation text to system clipboard with visual copy confirmation feedback.
   - **Invitation Text Box**: Textarea or preview box containing:
     ```text
                    Kepada Yth.
     *{nama}*

     *OM SWASTYASTU*,
     Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, tanpa mengurangi rasa hormat, karena keterbatasan jarak dan waktu, kami bermaksud mengundang Bapak/Ibu/Saudara/i dalam Upacara Manusa Yadnya Pawiwahan (Pernikahan).

     Undangan dapat dilihat dengan mengklik link dibawah ini :
     https://anselmoments.com/adi-eva/?to={nama}

     Suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i dan teman-teman dapat hadir pada acara kami dan memberikan doa restu.🙏

     Terima kasih.
     OM SHANTI, SHANTI, SHANTI OM
     ```
   - **"Kirim Whatsapp" Button**: Green button with WhatsApp icon; opens `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}` in a new window/tab.
   - **"Tujuan Baru" Button**: Red button with user icon; resets name field and returns UI to input step.

## Error Handling & Edge Cases
- Empty input validation: "Lanjutkan" button requires non-empty name string.
- Special character encoding: URL parameter `to={nama}` and WhatsApp text parameter are properly URI encoded.
