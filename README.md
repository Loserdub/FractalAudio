# 🌀 FractalAudio
### *Real-Time Algorithmic 3D Audio-Visual Engine & Generative Mathematics Platform*

Created by **Justin Tyler Ray (JRAY / loserdub)** • Founder of [Trust Node Logic](https://trustnodelogic.com)  
**Live Application:** [https://loserdub.github.io/FractalAudio/](https://loserdub.github.io/FractalAudio/)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-FractalAudio-lime?style=for-the-badge&logo=github)](https://loserdub.github.io/FractalAudio/)
[![Trust Node Logic](https://img.shields.io/badge/Ecosystem-Trust%20Node%20Logic-sky?style=for-the-badge)](https://trustnodelogic.com)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

---

## 👁️ Overview

**FractalAudio** is an interactive, browser-native 3D audio-visual engine developed by creative technologist and audio engineer **Justin Ray (JRAY)** under **Trust Node Logic**. Built at the intersection of generative mathematics, WebGL raymarching, and high-precision Web Audio API spectral analysis, FractalAudio translates real-time soundscapes into evolving mathematical visual environments.

By utilizing a 2048-point Fast Fourier Transform (FFT) extraction pipeline, FractalAudio analyzes audio energy continuously across **7 distinct frequency bands**—**Sub-Bass (20-60Hz)**, **Kick Punch (60-250Hz)**, **Low Mids (250-860Hz)**, **Snare Attack (860Hz-4kHz)**, **Presence (4kHz-7.5kHz)**, **Treble (7.5kHz-14kHz)**, and **Air (14kHz-20kHz)**. These metrics are fed into custom GLSL fragment shaders to drive 3D fractal raymarching, quaternion Julia set transformations, Mandelbulb morphing, and sacred geometry displacement with zero perceived latency.

---

## 🚀 Key Features & Capabilities

* **🎧 Continuous 7-Band Frequency Extraction:** Real-time spectral breakdown across Sub, Kick, Mid, Snare, Presence, Treble, and Air metrics with asymmetric dual-speed lerp (instant 0-lag attack on transients + liquid decay).
* **📐 9 Generative Geometry & 3D Raymarching Modes:**
  1. **Classic 2D Liquid Julia:** Multi-band parameter morphing & zoom pulsing.
  2. **3D Mandelbulb:** Power flexing (`6.0` to `16.0`) driven continuously by mids, sub-bass, and kick hits.
  3. **3D Quaternion Julia:** 4D vector morphing mapped across frequency bands.
  4. **3D Organic Ink Flow:** Fluid dispersion with sub-bass blob expansion and treble tendril ripples.
  5. **Sri Yantra Mandala:** Sacred geometry ring expansion and triangle beat hits.
  6. **Metatron's Cube:** Pulsing center sphere and outer beam frequency resonance.
  7. **3D Trefoil Torus Knot:** Audio-driven rotation, knot radius flex, and thickness modulation.
  8. **Cybernetic Prism Pyramid:** Audio-floating top crystal with high-frequency tilt & spin.
  9. **Infinite Cosmic Tunnel:** Sub-bass wall pulsing and snare energy rib waves.
* **🔮 4 Visual FX Overlays:** Cyber Laser Grid floor, Chromatic Glitch distortion, Star Dust particle flares, and Polar Kaleidoscope symmetry (4, 6, 8, 12, 16 folds).
* **🎛️ Dynamic Audio Reactivity Boost:** User-calibrated sensitivity slider (`0.5x` to `10.0x`) for fine-tuning baseline motion versus explosive drum hit pulsing.
* **📹 Real-Time Recording & Session Automation:** Built-in WebM video recording, PNG 4K snapshot capture, and JSON session keyframe automation export.
* **🌐 Zero-Friction Browser-Native Architecture:** Fully client-side processing using WebGL 1.0/2.0 and Web Audio API. No external plugins, WebAssembly binaries, or cloud dependencies required.

---

## 📐 7-Band Audio Frequency Mapping Architecture

| Band | Frequency Range | Visual Parameter Mapping in GLSL Shader ([fractal.ts](file:///c:/Users/User/Documents/%F0%9F%93%82%202_Coding_and_Development/GitHub/FractalAudio/src/shaders/fractal.ts)) |
| :--- | :--- | :--- |
| **Sub** | 20 Hz – 60 Hz | Controls 3D camera depth (`camDist`), camera sway (`ro.xy`), core obsidian pulse, and heavy domain warping in Ink Flow & Mandelbulb objects. |
| **Kick** | 60 Hz – 250 Hz | Drives primary 2D/3D fractal zoom pulsing (25–35%), Sri Yantra triangle size, Metatron center sphere size, Prism Pyramid crystal bounce height, and Cyber Grid floor illumination. |
| **Mid** | 250 Hz – 860 Hz | Modulates Mandelbulb fractal power (`6.0` to `16.0`), 3D camera orbit speed (`rotY`), 2D Julia rotation twist (`angle`), and Julia parameter `c` morphing across X/Y axes. |
| **Snare** | 860 Hz – 4 kHz | Triggers surface specular highlights (`spec`), Chromatic Glitch horizontal UV displacement, Torus knot thickness, and Metatron outer sphere size. |
| **Pres** (Presence) | 4 kHz – 7.5 kHz | Modulates volumetric edge rim lighting (`rim`), Ink Flow tendril wave frequency & amplitude (`dTendrils`), and Sri Yantra inner ring radii. |
| **Treb** (Treble) | 7.5 kHz – 14 kHz | Drifts procedural cosine color palettes (`palettePos += u_audio_treb * 0.5`), drives Star Dust particle flares (FX Mode 3), and creates top-end surface sheen. |
| **Air** | 14 kHz – 20 kHz | Drives micro-crystalline surface details, top-end chromatic edge dispersion, and Prism Pyramid floating crystal scale & shimmer. |

---

## 🛠️ Technical Stack & Architecture

* **Frontend Framework:** React 18 / TypeScript / Vite 6
* **Audio Engine:** Web Audio API (`AudioContext`, `AnalyserNode` with 2048 FFT size)
* **Graphics & Shaders:** WebGL Rendering Context, Custom GLSL Fragment & Vertex Shaders, ACES Filmic Tone Mapping
* **Styling & UI:** Tailwind CSS, Lucide Icons, Glassmorphism UI
* **Deployment:** GitHub Pages & Trust Node Logic CDN

---

## 📥 Local Development

To run the FractalAudio environment on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/loserdub/FractalAudio.git
   cd FractalAudio
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build Production Bundle:**
   ```bash
   npm run build
   ```

---

## 🖇️ Creator Entity & Ecosystem

**FractalAudio** is designed and maintained by **Justin Tyler Ray (JRAY / loserdub)** as part of **Trust Node Logic**—an initiative exploring hybrid AI music production, generative audio-visual systems, C2PA content provenance, and audio engineering.

* **Developer & Artist:** Justin Tyler Ray (JRAY)
* **Official Website:** [https://trustnodelogic.com](https://trustnodelogic.com)
* **GitHub:** [https://github.com/loserdub](https://github.com/loserdub)
* **LinkedIn:** [Justin Ray on LinkedIn](https://www.linkedin.com/in/jray-me/)
* **Music & Audio Work:** [VISION on SoundCloud](https://soundcloud.com/visiontracks) • [Spotify](https://open.spotify.com/artist/3VZelnnW9OR0DyR2qRn4Oq)
* **MusicBrainz:** [Justin Ray Entity](https://musicbrainz.org/artist/882fdb9b-8655-45dd-8e24-a59cd750d053)

---

## ⚖️ License

© 2026 **Justin Tyler Ray (JRAY / Trust Node Logic)**. Released under the [MIT License](LICENSE).  
*Visualizing the algorithm, one frequency at a time.* 👑
