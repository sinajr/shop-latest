
import type { ISourceOptions } from "@tsparticles/engine";

// Renamed from GLOBAL_PARTICLE_OPTIONS
export const INTERACTIVE_BOX_PARTICLE_OPTIONS: ISourceOptions = {
  background: {
    color: {
      value: "#121721", // Specific dark background for the particle canvas
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "bubble",
      },
    },
    modes: {
      bubble: {
        distance: 40,
        duration: 2,
        opacity: 0.8, // Corrected from 8
        size: 6,
        speed: 3,
      },
    },
  },
  particles: {
    color: {
      value: "#ff0000", // Red particles
      animation: {
        enable: true,
        speed: 20,
        sync: true,
      },
    },
    links: {
      blink: false,
      color: "random", // Random link color
      consent: false,
      distance: 30,
      enable: true,
      opacity: 0.3,
      width: 0.5,
    },
    move: {
      enable: true,
      outModes: "bounce",
      speed: { min: 0.5, max: 1 },
    },
    number: {
      value: 250,
    },
    opacity: {
      animation: {
        enable: true,
        speed: 2,
        sync: false,
      },
      random: false, // Explicitly false
      value: { min: 0.05, max: 1 },
    },
    shape: {
      type: "star",
    },
    size: {
      animation: {
        enable: false,
        speed: 40,
        sync: false,
      },
      random: true,
      value: { min: 0.1, max: 1 },
    },
  },
   polygon: {
     draw: {
       enable: true,
       stroke: {
         color: "#fff", // White stroke for polygon
         width: 0.3,
         opacity: 0.2,
       },
     },
     move: {
       radius: 10,
     },
     inline: {
       arrangement: "equidistant",
     },
     scale: 0.5,
     type: "inline",
     url: "https://particles.js.org/images/smalldeer.svg", // SVG for the mask
   },
  fullScreen: { enable: false },
};

// New simpler options for the footer (or other general use)
export const DEFAULT_FOOTER_PARTICLE_OPTIONS: ISourceOptions = {
  fullScreen: { enable: false },
  background: {
    color: {
      value: "transparent", // Transparent background for footer particles
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "repulse",
      },
    },
    modes: {
      repulse: {
        distance: 60,
        duration: 0.4,
        speed: 0.5,
      },
    },
  },
  particles: {
    color: {
      value: "hsl(var(--accent))", // Gold particles to match theme
    },
    links: {
      color: { value: "hsl(var(--accent))" },
      distance: 130,
      enable: true,
      opacity: 0.25,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "out",
      },
      random: true,
      speed: 0.8,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 1000, // Wider area for fewer particles
      },
      value: 40, // Fewer particles for footer
    },
    opacity: {
      value: {min: 0.1, max: 0.4},
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 2.5 },
    },
  },
  detectRetina: true,
};
