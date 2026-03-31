# 🌀 FractalAudio
### *Algorithmic visualization driven by real-time audio analysis.*

Created by **Justin Tyler Ray (jray)** • [jray.me](https://jray.me)  
**Live Demo:** [FractalAudio](https://loserdub.github.io/FractalAudio/)

---

## 👁️ Overview
**FractalAudio** is an interactive, browser-based engine bridging the gap between digital soundscapes and generative mathematics. By tapping into web-native audio tools, this project analyzes audio frequencies in real time and maps the resulting FFT (Fast Fourier Transform) data to complex fractal rendering algorithms. 

The result is a highly responsive, evolving visual environment that breathes in perfect sync with the audio input—designed for creative developers, audio engineers, and visual artists.

---

## 🚀 Key Features

*   **🎧 Real-Time Audio Reactivity:** Utilizes high-precision frequency and amplitude data to drive fractal parameters (scale, depth, iteration, and color) with zero perceived latency.
*   **📐 Generative Rendering:** Real-time generation of complex fractal equations that warp and mutate dynamically based on low-end punch, mid-range presence, and high-end clarity.
*   **🎛️ Interactive Controls:** User-tweakable parameters allow for on-the-fly manipulation, letting you dial in the exact visual aesthetic to match different tempos and genres.
*   **⚡ High-Performance Architecture:** Optimized for the browser using lightweight APIs to ensure buttery-smooth framerates even during intensive audio-visual processing.
*   **🌐 Zero-Friction Setup:** Completely browser-native. No plugins or heavy local installations required to experience the audio-visual sync.

---

## 🛠️ Technical Stack
*   **Audio Engine:** Web Audio API (AnalyserNode for real-time waveform and frequency data extraction)
*   **Rendering:** HTML5 Canvas / WebGL (for high-performance mathematical computation)
*   **Logic:** Vanilla JavaScript / ES6+
*   **Deployment:** GitHub Pages

---

## 📥 Local Development

To run the FractalAudio environment on your local machine:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/loserdub/FractalAudio.git
    ```
2.  **Navigate to the Directory:**
    ```bash
    cd FractalAudio
    ```
3.  **Launch a Local Server:**
    *(Because of CORS and Web Audio API security restrictions, you must run this over a local server rather than just opening the HTML file directly).*
    ```bash
    # If using Python 3:
    python -m http.server 8000
    
    # Or using Node.js/npx:
    npx serve .
    ```
4.  **Open in Browser:**
    Navigate to `http://localhost:8000`

---

## 🖇️ The Ecosystem
FractalAudio is part of the broader **JRAY** creative developer ecosystem—a collection of tools and experiments exploring the intersection of human intent, auditory processing, and algorithmic precision.

*   **Developer:** Justin Tyler Ray
*   **Portfolio:**[jray.me](https://jray.me)
*   **GitHub:** [loserdub](https://github.com/loserdub)

---

## ⚖️ License
© 2026 Justin Tyler Ray. All rights reserved.  
*Visualizing the algorithm, one frequency at a time.* 👑
