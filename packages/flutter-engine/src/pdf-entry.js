// pdf.js for the Flutter engine: one classic script (global `AxiomPdfJs`) loaded when a PDF is
// opened. The worker code runs in the page ("fake worker"), so no extra files or module
// workers are needed inside the WebView.
import * as pdfjs from 'pdfjs-dist';
import * as worker from 'pdfjs-dist/build/pdf.worker.mjs';

globalThis.pdfjsWorker = worker;
globalThis.AxiomPdfJs = pdfjs;
