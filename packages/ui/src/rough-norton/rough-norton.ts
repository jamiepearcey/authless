// rough-notation-patched.ts
import {
    Rect,
    RoughAnnotationConfig,
    RoughAnnotation,
    SVG_NS,
    RoughAnnotationGroup,
    DEFAULT_ANIMATION_DURATION,
    FullPadding,
    BracketType,
  } from "./model";
  import { ResolvedOptions, OpSet } from "roughjs/bin/core";
  import { line, rectangle, ellipse, linearPath } from "roughjs/bin/renderer";
  import { Point } from "roughjs/bin/geometry";
  import { randomSeed } from "roughjs/bin/math";
  
  /* -------------------------------------------------------------------------- */
  /* Utilities (inlined)                                                        */
  /* -------------------------------------------------------------------------- */
  
  export function ensureKeyframes() {
    if (!(window as any).__rno_kf_s) {
      const style = ((window as any).__rno_kf_s = document.createElement("style"));
      style.textContent = `@keyframes rough-notation-dash { to { stroke-dashoffset: 0; } }`;
      document.head.appendChild(style);
    }
  }
  
  type RoughOptionsType = "highlight" | "single" | "double";
  
  function getOptions(type: RoughOptionsType, seed: number): ResolvedOptions {
    return {
      maxRandomnessOffset: 2,
      roughness: type === "highlight" ? 3 : 1.5,
      bowing: 1,
      stroke: "#000",
      strokeWidth: 1.5,
      curveTightness: 0,
      curveFitting: 0.95,
      curveStepCount: 9,
      fillStyle: "hachure", // change to "solid" for a smooth marker fill
      fillWeight: -1,
      hachureAngle: -41,
      hachureGap: -1,
      dashOffset: -1,
      dashGap: -1,
      zigzagOffset: -1,
    //  combineNestedSvgPaths: false,
      disableMultiStroke: type !== "double",
      disableMultiStrokeFill: false,
      seed,
      // Newer roughjs fields (avoid TS mismatches)
      preserveVertices: false,
      fillShapeRoughnessGain: 1,
    };
  }
  
  function parsePadding(config: RoughAnnotationConfig): FullPadding {
    const p = config.padding;
    if (p || p === 0) {
      if (typeof p === "number") return [p, p, p, p];
      if (Array.isArray(p)) {
        const pa = p as number[];
        if (pa.length) {
          switch (pa.length) {
            case 4: return [...pa] as FullPadding;
            case 1: return [pa[0], pa[0], pa[0], pa[0]];
            case 2: return [...pa, ...pa] as FullPadding;
            case 3: return [...pa, pa[1]] as FullPadding;
            default: return [pa[0], pa[1], pa[2], pa[3]];
          }
        }
      }
    }
    return [5, 5, 5, 5];
  }
  
  function opsToPath(opList: OpSet[]): string[] {
    const paths: string[] = [];
    for (const drawing of opList) {
      let path = "";
      for (const item of drawing.ops) {
        const data = item.data;
        switch (item.op) {
          case "move":
            if (path.trim()) paths.push(path.trim());
            path = `M${data[0]} ${data[1]} `;
            break;
          case "bcurveTo":
            path += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
            break;
          case "lineTo":
            path += `L${data[0]} ${data[1]} `;
            break;
        }
      }
      if (path.trim()) paths.push(path.trim());
    }
    return paths;
  }
  
  /** Render into an SVG-like (SVG or <g>) */
  export function renderAnnotation(
    svgLike: SVGSVGElement | SVGGElement,
    rect: Rect,
    config: RoughAnnotationConfig,
    animationGroupDelay: number,
    animationDuration: number,
    seed: number
  ) {
    const opList: OpSet[] = [];
    let strokeWidth = config.strokeWidth || 2;
    const padding = parsePadding(config);
    const animate = config.animate === undefined ? true : !!config.animate;
    const iterations = config.iterations || 2;
    const rtl = config.rtl ? 1 : 0;
    const o = getOptions("single", seed);
  
    switch (config.type) {
      case "underline": {
        const y = rect.y + rect.h + padding[2];
        for (let i = rtl; i < iterations + rtl; i++) {
          if (i % 2) opList.push(line(rect.x + rect.w, y, rect.x, y, o));
          else opList.push(line(rect.x, y, rect.x + rect.w, y, o));
        }
        break;
      }
      case "strike-through": {
        const y = rect.y + rect.h / 2;
        for (let i = rtl; i < iterations + rtl; i++) {
          if (i % 2) opList.push(line(rect.x + rect.w, y, rect.x, y, o));
          else opList.push(line(rect.x, y, rect.x + rect.w, y, o));
        }
        break;
      }
      case "box": {
        const x = rect.x - padding[3];
        const y = rect.y - padding[0];
        const width = rect.w + (padding[1] + padding[3]);
        const height = rect.h + (padding[0] + padding[2]);
        for (let i = 0; i < iterations; i++) opList.push(rectangle(x, y, width, height, o));
        break;
      }
      case "bracket": {
        const brackets: BracketType[] = Array.isArray(config.brackets)
          ? config.brackets
          : config.brackets
          ? [config.brackets]
          : ["right"];
        const lx = rect.x - padding[3] * 2;
        const rx = rect.x + rect.w + padding[1] * 2;
        const ty = rect.y - padding[0] * 2;
        const by = rect.y + rect.h + padding[2] * 2;
        for (const br of brackets) {
          let points: Point[];
          switch (br) {
            case "bottom":
              points = [
                [lx, rect.y + rect.h],
                [lx, by],
                [rx, by],
                [rx, rect.y + rect.h],
              ];
              break;
            case "top":
              points = [
                [lx, rect.y],
                [lx, ty],
                [rx, ty],
                [rx, rect.y],
              ];
              break;
            case "left":
              points = [
                [rect.x, ty],
                [lx, ty],
                [lx, by],
                [rect.x, by],
              ];
              break;
            case "right":
              points = [
                [rect.x + rect.w, ty],
                [rx, ty],
                [rx, by],
                [rect.x + rect.w, by],
              ];
              break;
          }
          if (points) opList.push(linearPath(points, false, o));
        }
        break;
      }
      case "crossed-off": {
        const x = rect.x, y = rect.y, x2 = x + rect.w, y2 = y + rect.h;
        for (let i = rtl; i < iterations + rtl; i++) {
          if (i % 2) opList.push(line(x2, y2, x, y, o));
          else opList.push(line(x, y, x2, y2, o));
        }
        for (let i = rtl; i < iterations + rtl; i++) {
          if (i % 2) opList.push(line(x, y2, x2, y, o));
          else opList.push(line(x2, y, x, y2, o));
        }
        break;
      }
      case "circle": {
        const doubleO = getOptions("double", seed);
        const width = rect.w + (padding[1] + padding[3]);
        const height = rect.h + (padding[0] + padding[2]);
        const x = rect.x - padding[3] + width / 2;
        const y = rect.y - padding[0] + height / 2;
        const fullItr = Math.floor(iterations / 2);
        const singleItr = iterations - fullItr * 2;
        for (let i = 0; i < fullItr; i++) opList.push(ellipse(x, y, width, height, doubleO));
        for (let i = 0; i < singleItr; i++) opList.push(ellipse(x, y, width, height, o));
        break;
      }
      case "highlight": {
        const oh = getOptions("highlight", seed);
        strokeWidth = rect.h * 0.95;
        const y = rect.y + rect.h / 2;
        for (let i = rtl; i < iterations + rtl; i++) {
          if (i % 2) opList.push(line(rect.x + rect.w, y, rect.x, y, oh));
          else opList.push(line(rect.x, y, rect.x + rect.w, y, oh));
        }
        break;
      }
    }
  
    if (!opList.length) return;
  
    const pathStrings = opsToPath(opList);
    const lengths: number[] = [];
    const pathElements: SVGPathElement[] = [];
    let totalLength = 0;
  
    for (const d of pathStrings) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", config.color || "currentColor");
      path.setAttribute("stroke-width", `${strokeWidth}`);
      if (animate) {
        const length = path.getTotalLength();
        lengths.push(length);
        totalLength += length;
      }
      (svgLike as SVGElement).appendChild(path);
      pathElements.push(path);
    }
  
    if (animate) {
      let durationOffset = 0;
      for (let i = 0; i < pathElements.length; i++) {
        const path = pathElements[i];
        const length = lengths[i];
        const duration = totalLength ? animationDuration * (length / totalLength) : 0;
        const delay = animationGroupDelay + durationOffset;
        const style = path.style;
        style.strokeDashoffset = `${length}`;
        style.strokeDasharray = `${length}`;
        style.animation = `rough-notation-dash ${duration}ms ease-out ${delay}ms forwards`;
        durationOffset += duration;
      }
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /* Patched RoughAnnotation implementation                                     */
  /* -------------------------------------------------------------------------- */
  
  type AnnotationState = "unattached" | "not-showing" | "showing";
  
  class RoughAnnotationImpl implements RoughAnnotation {
    private _state: AnnotationState = "unattached";
    private _config: RoughAnnotationConfig;
    private _ro?: any;
    private _seed = randomSeed();
  
    private _e: HTMLElement;
    private _svg?: SVGSVGElement;
    private _group?: SVGGElement;
  
    private _lastSizes: Rect[] = [];
    private _baseRects: Rect[] = []; // geometry used when we last (re)built paths
    private _currentOffset = { x: 0, y: 0 }; // translate applied to <g> for pure movement
  
    private _rafId: number | null = null;
  
    _animationDelay = 0;
  
    constructor(e: HTMLElement, config: RoughAnnotationConfig) {
      this._e = e;
      this._config = JSON.parse(JSON.stringify(config));
      this.attach();
    }
  
    get animate() { return this._config.animate; }
    set animate(value) { this._config.animate = value; }
  
    get animationDuration() { return this._config.animationDuration; }
    set animationDuration(value) { this._config.animationDuration = value; }
  
    get iterations() { return this._config.iterations; }
    set iterations(value) { this._config.iterations = value; }
  
    get color() { return this._config.color; }
    set color(value) { if (this._config.color !== value) { this._config.color = value; this.refresh(); } }
  
    get strokeWidth() { return this._config.strokeWidth; }
    set strokeWidth(value) { if (this._config.strokeWidth !== value) { this._config.strokeWidth = value; this.refresh(); } }
  
    get padding() { return this._config.padding; }
    set padding(value) { if (this._config.padding !== value) { this._config.padding = value; this.refresh(); } }
  
    private _resizeListener = () => {
      if (this._rafId != null) return;
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (this._state !== "showing" || !this._svg || !this._group) return;
  
        const newRects = this.rects();
  
        // If no baseline yet, store and bail
        if (!this._baseRects.length) {
          this._baseRects = newRects.slice();
          this._lastSizes = newRects.slice();
          return;
        }
  
        const delta = this.rectsPureTranslation(newRects, this._baseRects);
        if (delta) {
          // Pure movement → translate existing paths (no redraw)
          this._currentOffset = { x: delta.dx, y: delta.dy };
          this._group.setAttribute(
            "transform",
            `translate(${this._currentOffset.x}, ${this._currentOffset.y})`
          );
          this._lastSizes = newRects.slice();
          return;
        }
  
        // Geometry changed (size/line-breaks) → rebuild once (no animation)
        this.render(this._svg, true);
      });
    };
  
    private attach() {
      if (this._state === "unattached" && this._e.parentElement) {
        ensureKeyframes();
        const svg = (this._svg = document.createElementNS(SVG_NS, "svg"));
        svg.setAttribute("class", "rough-annotation");
        const style = svg.style;
        // Anchor to viewport/containing block for stable rect math
        style.position = "fixed";
        style.top = "0";
        style.left = "0";
        style.overflow = "visible";
        style.pointerEvents = "none";
        style.width = "0";
        style.height = "0";
  
        const prepend = this._config.type === "highlight";
        this._e.insertAdjacentElement(prepend ? "beforebegin" : "afterend", svg);
        this._state = "not-showing";
  
        if (prepend) {
          const computedPos = window.getComputedStyle(this._e).position;
          if (!computedPos || computedPos === "static") this._e.style.position = "relative";
        }
        this.attachListeners();
      }
    }
  
    private detachListeners() {
      window.removeEventListener("resize", this._resizeListener);
      if (this._ro) this._ro.unobserve(this._e);
      if (this._rafId != null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    }
  
    private attachListeners() {
      this.detachListeners();
      window.addEventListener("resize", this._resizeListener, { passive: true });
  
      if (!this._ro && "ResizeObserver" in window) {
        this._ro = new (window as any).ResizeObserver((entries: any) => {
          for (const entry of entries) {
            if (entry.contentRect) this._resizeListener();
          }
        });
      }
      if (this._ro) this._ro.observe(this._e);
    }
  
    private haveRectsChanged(): boolean {
      if (!this._lastSizes.length) return true;
      const newRects = this.rects();
      if (newRects.length !== this._lastSizes.length) return true;
      for (let i = 0; i < newRects.length; i++) {
        if (!this.isSameRect(newRects[i], this._lastSizes[i])) return true;
      }
      return false;
    }
  
    private rectsPureTranslation(newRects: Rect[], oldRects: Rect[]) {
      if (newRects.length !== oldRects.length || newRects.length === 0) return null;
      // Must keep same sizes/line-breaks
      for (let i = 0; i < newRects.length; i++) {
        const a = newRects[i], b = oldRects[i];
        if (Math.abs(a.w - b.w) >= 0.5 || Math.abs(a.h - b.h) >= 0.5) return null;
      }
      const dx = newRects[0].x - oldRects[0].x;
      const dy = newRects[0].y - oldRects[0].y;
      for (let i = 1; i < newRects.length; i++) {
        if (Math.abs((newRects[i].x - oldRects[i].x) - dx) > 0.5) return null;
        if (Math.abs((newRects[i].y - oldRects[i].y) - dy) > 0.5) return null;
      }
      return { dx, dy };
    }
  
    private isSameRect(a: Rect, b: Rect): boolean {
      const eq = (x: number, y: number) => Math.abs(x - y) < 0.5;
      return eq(a.x, b.x) && eq(a.y, b.y) && eq(a.w, b.w) && eq(a.h, b.h);
    }
  
    isShowing(): boolean {
      return this._state !== "not-showing";
    }
  
    private pendingRefresh?: Promise<void>;
    private refresh() {
      if (this.isShowing() && !this.pendingRefresh) {
        this.pendingRefresh = Promise.resolve().then(() => {
          if (this.isShowing()) this.show();
          delete this.pendingRefresh;
        });
      }
    }
  
    show(): void {
      switch (this._state) {
        case "unattached":
          break;
        case "showing":
          if (this._svg) this.render(this._svg, true); // in-place update; geometry-only
          break;
        case "not-showing":
          this.attach();
          if (this._svg) this.render(this._svg, false);
          break;
      }
    }
  
    hide(): void {
      if (this._group?.parentElement) {
        this._group.parentElement.removeChild(this._group);
      }
      this._group = undefined;
      this._state = "not-showing";
    }
  
    remove(): void {
      if (this._svg?.parentElement) this._svg.parentElement.removeChild(this._svg);
      this._group = undefined;
      this._svg = undefined;
      this._state = "unattached";
      this.detachListeners();
    }
  
    private render(svg: SVGSVGElement, ensureNoAnimation: boolean) {
      let config = this._config;
      if (ensureNoAnimation) {
        config = JSON.parse(JSON.stringify(this._config));
        config.animate = false;
      }
  
      const rects = this.rects();
      const totalDuration = config.animationDuration || DEFAULT_ANIMATION_DURATION;
  
      // Build into a temp <g>, then atomically swap (no blank frame)
      const g = document.createElementNS(SVG_NS, "g");
  
      let totalWidth = 0;
      rects.forEach((r) => (totalWidth += r.w));
      let delay = 0;
      for (let i = 0; i < rects.length; i++) {
        const ad = totalWidth ? totalDuration * (rects[i].w / totalWidth) : 0;
        renderAnnotation(g, rects[i], config, delay + this._animationDelay, ad, this._seed);
        delay += ad;
      }
  
      if (this._group && this._group.parentNode === svg) {
        svg.replaceChild(g, this._group);
      } else {
        svg.appendChild(g);
      }
      this._group = g;
  
      // New baseline geometry; reset any previous translation
      this._currentOffset = { x: 0, y: 0 };
      this._group.removeAttribute("transform");
      this._baseRects = rects.slice();
      this._lastSizes = rects.slice();
      this._state = "showing";
    }
  
    private rects(): Rect[] {
      const ret: Rect[] = [];
      if (this._svg) {
        if (this._config.multiline) {
          const rs = this._e.getClientRects();
          for (let i = 0; i < rs.length; i++) ret.push(this.svgRect(this._svg, rs[i]));
        } else {
          ret.push(this.svgRect(this._svg, this._e.getBoundingClientRect()));
        }
      }
      return ret;
    }
  
    private svgRect(svg: SVGSVGElement, bounds: DOMRect | DOMRectReadOnly): Rect {
      const rect1 = svg.getBoundingClientRect(); // (0,0) of viewport/containing block
      const rect2 = bounds;
      return {
        x: (rect2.x || rect2.left) - (rect1.x || rect1.left),
        y: (rect2.y || rect2.top) - (rect1.y || rect1.top),
        w: rect2.width,
        h: rect2.height,
      };
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /* Public API                                                                 */
  /* -------------------------------------------------------------------------- */
  
  export function annotate(element: HTMLElement, config: RoughAnnotationConfig): RoughAnnotation {
    return new RoughAnnotationImpl(element, config);
  }
  
  export function annotationGroup(annotations: RoughAnnotation[]): RoughAnnotationGroup {
    let delay = 0;
    for (const a of annotations) {
      const ai = a as unknown as RoughAnnotationImpl;
      ai._animationDelay = delay;
      const duration = ai.animationDuration === 0 ? 0 : ai.animationDuration || DEFAULT_ANIMATION_DURATION;
      delay += duration;
    }
    const list = [...annotations];
    return {
      show() { for (const a of list) a.show(); },
      hide() { for (const a of list) a.hide(); },
    };
  }