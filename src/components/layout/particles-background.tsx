
"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions, type Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { loadPolygonMaskPlugin } from "tsparticles-plugin-polygon-mask";
import { cn } from "@/lib/utils";

interface ParticlesBackgroundProps {
  containerId: string;
  optionsOverride?: ISourceOptions;
  className?: string; // Added className prop for the container div
}

// Default simple gold-themed particle options
const defaultParticleOptions: ISourceOptions = {
  fullScreen: { enable: false },
  background: {
    color: {
      value: "transparent",
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onClick: {
        enable: true,
        mode: "push",
      },
      onHover: {
        enable: true,
        mode: "repulse",
      },
    },
    modes: {
      push: {
        quantity: 1,
      },
      repulse: {
        distance: 80,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: {
      value: "hsl(var(--accent))", // Gold
    },
    links: {
      color: { value: "hsl(var(--accent))" }, // Gold links
      distance: 120,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "out",
      },
      random: true,
      speed: 0.5,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 30,
    },
    opacity: {
      value: 0.3,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 2 },
    },
  },
  detectRetina: true,
};

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({
  containerId,
  optionsOverride,
  className,
}) => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
      await loadPolygonMaskPlugin(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container?: Container): Promise<void> => {
    // console.log(containerId, "particles loaded");
  }, [containerId]);

  const activeOptions = useMemo(() => ({
    ...(optionsOverride || defaultParticleOptions),
    fullScreen: { enable: false }, // Always ensure particles are contained
  }), [optionsOverride]);

  if (init) {
    return (
      // Use the passed className for the container
      <div id={containerId} className={cn("relative w-full h-full", className)}>
        <Particles
          id={`${containerId}-canvas`}
          options={activeOptions}
          particlesLoaded={particlesLoaded}
          className="h-full w-full" // Canvas will fill this div
        />
      </div>
    );
  }

  return <div id={containerId} className={cn("relative w-full h-full", className)} />; // Placeholder during init
};
