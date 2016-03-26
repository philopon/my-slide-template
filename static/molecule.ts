// vim: foldmethod=marker

import * as axios from "axios";

declare namespace pv {// {{{
    namespace io {
        function pdb(pdbData: string, options?: {loadAllModels?: boolean}): pv.mol.Mol
        function sdf(pdbData: string): pv.mol.Mol
    }

    namespace color {// {{{
        class ColorOp {}
    }// }}}

    namespace mol {// {{{
        type SpecialQuery = "protein" | "ligand" | "water";

        type Query
            = {cname: string} | {cnames: string[]}
            | {rname: string} | {rnames: string[]}
            | {aname: string} | {anames: string[]}
            | {rnum: number} | {rnums: number[]}
            | {rnumRange: [number, number]}
            | {rindices: number[]} | {rindexRange: [number, number]}
            | SpecialQuery

        class Mol {
            select(q: Query): Mol;
            center(): GLM.IArray;
            name(): string;

            show(): void;
        }
    }// }}}

    type RenderMode
        = "sline"
        | "lines"
        | "trace"
        | "lineTrace"
        | "cartoon"
        | "tube"
        | "spheres"
        | "ballsAndSticks"

    class Viewer {
        constructor(element: Element, opts: {[key: string]: any});
        renderAs(name: string, structure: mol.Mol, mode: RenderMode, options: {[key: string]: any}): void;
        clear(): void;
        rotation(): GLM.IArray;
        center(): GLM.IArray;
        zoom(): number;
        setCamera(rotation: GLM.IArray, center: GLM.IArray, zoom: number, ms?: number): void;
        setRotation(rotation: GLM.IArray, ms?: number): void;
        setCenter(center: GLM.IArray, ms?: number): void;
        centerOn(obj: mol.Mol): void;
        fitTo(what: mol.Mol|mol.Mol[]): void;
        show(glob: string): void;
        hide(glob: string): void;
        get(name: string): mol.Mol;
        requestRedraw(): void;
        spin(enable: boolean): void;
        spin(speed: number, axis: [number, number, number]): void;
        rockAndRoll(enable: boolean): void;

        imageData(): string;
        resize(width: number, height: number): void;
    }
}// }}}

namespace MolViewer {
    class ParseError extends Error {// {{{
        constructor(message: string) {
            super(message);
            this.name = "ParseError";
        }
    }// }}}

    class FileTypeError extends Error {// {{{
        constructor(public type: string) {
            super("unknown mol file type: " + type);
            this.name = "FileTypeError";
        }
    }// }}}

    namespace pvUtil {// {{{
        const RenderModes: Set<string> = new Set(
            ["sline", "lines", "trace", "lineTrace",
                "cartoon", "tube", "spheres", "ballsAndSticks"]);

        export function parseRenderMode(s: string): pv.RenderMode {
            if (RenderModes.has(s)) {
                return s as pv.RenderMode;
            } else {
                throw new ParseError("RenderMode: parse error \"" + this.input + "\"");
            }
        }

        export const SpecialQueries: string[] = ["protein", "ligand", "water"];
    }// }}}

    abstract class Renderable {// {{{
        private static serial: number = 0;
        private _name: string = null;

        protected getSerial(): number {
            return Renderable.serial++;
        }

        get name(): string {
            return this._name;
        }

        set name(name: string) {
            if (typeof name === 'string') {
                this._name = name.replace('!', '!!');
            } else {
                this._name = '!' + this.getSerial();
            }
        }

        abstract getPvObj(): any
        abstract getCenter(): GLM.IArray
        abstract render(viewer: pv.Viewer): void
    }// }}}

    class Molecule extends Renderable {// {{{
    // {{{ variables
        private static SpecialQueries: Set<string> = new Set(pvUtil.SpecialQueries.concat(["*"]));

        private selector: pv.mol.Query = null;
        private mode: pv.RenderMode = "cartoon";
        private color: pv.color.ColorOp = null;
        private _options: {[key: string]: string|number} = {};
    // }}}

        constructor(private molecule: pv.mol.Mol, name: string= null) {// {{{
            super();
            this.name = name;
        }// }}}

        getCenter(): GLM.IArray {return this.molecule.center(); }

        getPvObj(): pv.mol.Mol {return this.molecule; }

        render(viewer: pv.Viewer): void {// {{{
            let mol = (this.selector === null) ? this.molecule : this.molecule.select(this.selector);
            viewer.renderAs(this.name, mol, this.mode, this.options);
        }// }}}

        private get options(): {[key: string]: any}{// {{{
            let opts = Object.assign({}, this._options);
            if (this.color) Object.assign(opts, {color: this.color});
            return opts;
        }// }}}

        parseRenderOption(q: string): this { // {{{
            let [name, selector, mode, color, opts] = q.split("|");

            if (name) this.name = name;
            if (selector) this.selector = Molecule.parseSelector(selector);
            if (mode) this.mode = pvUtil.parseRenderMode(mode);
            if (color) this.color = Molecule.parseColor(color);
            if (opts) this._options = Molecule.parseOptions(opts);

            return this;
        }// }}}

        private static parseSelector(q: string): pv.mol.Query {// {{{
            if (Molecule.SpecialQueries.has(q)) {
                return q as pv.mol.SpecialQuery;
            }

            let [qtype, arg] = q.split(":");

            if (qtype === "cname") return {cname: arg};
            if (qtype === "rname") return {rname: arg};
            if (qtype === "cname") return {aname: arg};

            if (qtype === "cnames") return {cnames: arg.split(",")};
            if (qtype === "rnames") return {rnames: arg.split(",")};
            if (qtype === "cnames") return {anames: arg.split(",")};

            if (qtype === "rnum") return {rnum: parseInt(arg)};

            function parseIntList(s: string): number[] {
                return s.split(",").map(v => parseInt(v));
            }

            if (qtype === "rnums") return {rnums: parseIntList(arg)};
            if (qtype === "rindices") return {rindices: parseIntList(arg)};

            function parseRange(s: string): [number, number] {
                let [start, end] = s.split("-").map(v => parseInt(v));
                return [start, end];
            }

            if (qtype === "rnumRange") return {rnumRange: parseRange(arg)};
            if (qtype === "rindexRange") return {rindexRange: parseRange(arg)};

            throw new ParseError("query parse error: " + q);
        }// }}}

        private static parseValue(v: string): number|string {// {{{
            let f = parseFloat(v);
            return isFinite(f) ? f : v;
        }// }}}

        private static parseColor(q: string): pv.color.ColorOp {// {{{
            let [op, raw_args] = q.split(":"),
                args = raw_args ? raw_args.split(",").map(this.parseValue) : [];

            return (pv.color as any)[op](...args);
        }// }}}

        private static parseOptions(q: string): {[key: string]: string|number} {// {{{
            let d: {[key: string]: string|number} = {};
            for (let [k, v] of q.split(",").map(kv => kv.split(":"))) {
                d[k] = v;
            }
            return d;
        }// }}}
    }// }}}

    export type SlideNumber = {indexh: number, indexv: number}

    type Camera = [GLM.IArray, GLM.IArray, number];

    export class Viewer {// {{{
        // {{{ variables
        private div: Element;
        private parent: HTMLElement = null;
        private canvas: HTMLCanvasElement;

        private viewer: pv.Viewer;

        private slides: {[key: string]: Context};
        private context: Context = null;
        // }}}

        // {{{ blurKeys
        // https://github.com/hakimel/reveal.js/blob/18b644cf8f1ae04b16f962655b99cb786f08ef2c/js/reveal.js#L3969-L3997
        private static blurKeys: Set<number> = new Set([
            80, 33, // p, page up
            78, 34, // n, page down
            72, 37, // h, left
            76, 39, // l, right
            75, 38, // k, up
            74, 40, // j, down
            30, 35, 32, 13, // home, end, space, return
            58, 59, 66, 190, 191, // two-spot, semicolon, b, period, black screen
            70, // f
            65
        ]); // }}}

        constructor(opts: {[key: string]: any}= {}, private ms: number= 250) {// {{{
            this.div = document.createElement("div");
            this.viewer = (pv.Viewer as any)(this.div, opts);
            this.canvas = this.div.querySelector("canvas") as HTMLCanvasElement;

            this.slides = {};
            this.initializeEvents(this.div.querySelector("textarea"));
        }// }}}

        static prettyCamera([rotation, center, zoom]: Camera, digit: number= 15): string {// {{{
            let p = Math.pow(2, digit),
                q = quat.fromMat3(quat.create(), mat3.fromMat4(mat3.create(), rotation)),
                a = new Array(9);

            a[0] = digit;
            (q as any).forEach((v: number, i: number) => {
                a[i + 1] = Math.round(v * p);
            });

            (center as any).forEach((v: number, i: number) => {
                a[i + 5] = Math.round(v * p);
            });
            a[8] = Math.round(zoom * p);

            return a.join(' ');
        }// }}}

        static parseCamera(str: string): [GLM.IArray, GLM.IArray, number] {// {{{
            let vs = str.split(' ').map(v => parseInt(v));
            if(!vs.reduce((a, v) => a && isFinite(v), true) || vs.length !== 9) {
                throw new ParseError('state string: ' + str);
            }

            let cs = vs.map(v => v / Math.pow(2, vs[0])),
                q = mat4.fromQuat(mat4.create(), quat.fromValues(cs[1], cs[2], cs[3], cs[4])),
                c = vec3.fromValues(cs[5], cs[6], cs[7]),
                z = cs[8];

            return [q, c, z];
        }// }}}

        getCamera(): Camera {// {{{
            return [this.viewer.rotation(), this.viewer.center(), this.viewer.zoom()];
        }// }}}

        private initializeEvents(textarea: Element): void {// {{{
            textarea.addEventListener("copy", (e: ClipboardEvent) => {
                e.preventDefault();
                let st = Viewer.prettyCamera(this.getCamera());
                e.clipboardData.setData("text/plain", st);
            });

            textarea.addEventListener("paste", (e: ClipboardEvent) => {
                e.preventDefault();
                let [r, c, z] = Viewer.parseCamera(e.clipboardData.getData('text/plain'));
                this.viewer.setCamera(r, c, z, this.ms);
            });

            textarea.addEventListener("keydown", (e: KeyboardEvent) => {
                if (Viewer.blurKeys.has(e.keyCode)) (e.target as HTMLElement).blur();
            });
        }// }}}

        private mountElement(element: HTMLElement): void {// {{{
            this.parent = element;
            element.style.visibility = "visible";

            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }

            element.appendChild(this.div);
            this.resize();
        }// }}}

        unmount(): void {// {{{
            let img = document.createElement("img"),
                width = this.canvas.width,
                height = this.canvas.height;

            img.setAttribute("src", this.viewer.imageData());
            img.setAttribute("width", "" + width);
            img.setAttribute("height", "" + height);

            this.parent.appendChild(img);
            this.parent.removeChild(this.div);
            this.parent = null;
        }// }}}

        resize(): void {// {{{
            if (!(this.parent instanceof Element)) return;
            this.viewer.resize(this.parent.clientWidth, this.parent.clientHeight);
        }// }}}

        private clear(): void {// {{{
            this.viewer.clear();
        }// }}}

        private getContext(sn: SlideNumber): Context {// {{{
            let key = sn.indexh + "," + sn.indexv,
                st = this.slides[key];

            if (st instanceof Context) {
                return st;
            } else {
                let cxt = new Context(sn);
                this.slides[key] = cxt;
                return cxt;
            }
        }// }}}

        restoreCamera(cam: string|Camera): void {// {{{
            if (cam === null) return;

            let [r, c, z] = (typeof cam === 'string') ? Viewer.parseCamera(cam) : cam;
            this.viewer.setCamera(r, c, z);
        }// }}}

        autoCamera(objects: Renderable[]): void {// {{{
            this.viewer.setRotation(mat4.create());
            this.viewer.fitTo(objects.map(o => o.getPvObj()));
        }// }}}

        async initContext(sn: SlideNumber): Promise<void> {// {{{
            let cxt = this.context = this.getContext(sn);
            if (!cxt.hasPV) return;

            let objects = await cxt.render(this.viewer);
            this.mountElement(cxt.element);

            let cam = this.parent.getAttribute('data-camera');

            if (cam !== null) {
                this.restoreCamera(cam);
            } else {
                this.autoCamera(objects);
                cam = Viewer.prettyCamera(this.getCamera());
            }

            let vis = this.parent.getAttribute('data-visible');

            if (vis === null) vis = objects.map(o => o.name).join(' ');

            cxt.initFragments(cam, vis);

            for (let cf of this.context.currentFragments()) {
                let cCam = cf.getAttribute('data-camera'),
                    cVis = cf.getAttribute('data-visible');

                if (typeof cCam === 'string') cam = cCam;
                if (typeof cVis === 'string') vis = cVis;
            }

            this.setScene(cam, vis, 0);
        }// }}}

        setScene(camera: string, visible: string, ms?: number): void {
            if (typeof visible === 'string') {
                this.viewer.hide('*');
                for(let vis of visible.split(' ')) {
                    let obj = this.viewer.get(vis);
                    if (obj !== null) obj.show();
                }
            }

            if (typeof camera === 'string') {
                let [r, c, z] = Viewer.parseCamera(camera);
                this.viewer.setCamera(r, c, z, (typeof ms === 'number') ? ms : this.ms);
            }

            this.viewer.requestRedraw();
        }

        async setContext(sn: SlideNumber): Promise<void> {// {{{
            let cxt = this.context;

            if (cxt.hasPV) {
                this.unmount();
                this.clear();
            }

            await this.initContext(sn);
        }// }}}
    }// }}}

    class Context {
        // {{{ variables
        private _objects: Renderable[];
        private fragmentInitialized: boolean= false;

        public slide: Element;
        public element: HTMLElement;
        // }}}

        constructor(sn: SlideNumber) {// {{{
            this.slide = Reveal.getSlide(sn.indexh, sn.indexv);
            this.element = this.slide.querySelector("x-pv") as HTMLElement;
        } // }}}

        currentFragments(): NodeListOf<Element> {// {{{
            return this.slide.querySelectorAll('.current-fragment');
        }// }}}

        initFragments(beforeCam: string, beforeVis: string): void {// {{{
            if(this.fragmentInitialized) return;

            for (let frag of this.slide.querySelectorAll('.fragment')) {
                let vis = frag.getAttribute('data-visible') || beforeVis,
                    cam = frag.getAttribute('data-camera') || beforeCam;

                if (typeof beforeVis === 'string') frag.setAttribute('data-before-visible', beforeVis);
                if (typeof vis === 'string') {
                    frag.setAttribute('data-visible', vis);
                    beforeVis = vis;
                }

                if (typeof beforeCam === 'string') frag.setAttribute('data-before-camera', beforeCam);
                if (typeof cam === 'string') {
                    frag.setAttribute('data-camera', cam);
                    beforeCam = cam;
                }
            }

            this.fragmentInitialized = true;
        }// }}}

        async getObjects(): Promise<Renderable[]> {// {{{
            if(this._objects) return this._objects;

            let renderables: Promise<Renderable[]>[] = [];

            while (this.element.firstChild) {
                let child = this.element.firstChild as HTMLElement,
                    tag = child.tagName.toLowerCase();

                if (tag === "x-mol") {// {{{
                    let dataType = child.getAttribute("data-type") || "pdb",
                        typ: "pdb" | "sdf";

                    if (dataType === "pdb") { typ = "pdb"; }
                    else if (dataType === "sdf") { typ = "sdf"; }
                    else throw new FileTypeError(dataType);

                    let rcStr = child.getAttribute("data-render");

                    renderables.push(
                        this.getMol(child.innerHTML, child.getAttribute("data-src"), typ).then(m => {
                            if (rcStr === null) {
                                return [new Molecule(m)];
                            } else {
                                return rcStr.split(" ").map(s => {
                                    return (new Molecule(m)).parseRenderOption(s);
                                });
                            }
                        })
                    );
                }// }}}

                this.element.removeChild(child);
            }

            return this._objects = [].concat(...await Promise.all(renderables));
        }// }}}

        private async getMol(text: string, url?: string, type: "pdb"|"sdf"= "pdb"): Promise<pv.mol.Mol> {// {{{
            if (typeof url === 'string') {
                let data = await axios.get<string>(url);
                text = data.data;
            }

            if (type === "pdb") return pv.io.pdb(text);
            else return pv.io.sdf(text);
        }// }}}

        get hasPV(): boolean{// {{{
            return !!this.element;
        }// }}}

        async render(viewer: pv.Viewer): Promise<Renderable[]> {// {{{
            let objects = await this.getObjects();
            for (let obj of objects) {
                obj.render(viewer);
            }
            return objects;
        }// }}}
    }
}

const DOMContentLoaded: Promise<void> = new Promise<void>(resolve => {
    window.addEventListener("DOMContentLoaded", () => resolve());
});

const RevealReady: Promise<void> = new Promise<void>((resolve) => {
    (Reveal as any).isReady() ? resolve() : Reveal.addEventListener("ready", () => {resolve()});
});

(async () => {
    await DOMContentLoaded;
    await RevealReady;

    let viewer = new MolViewer.Viewer({antialias: true, quality: "high"});

    viewer.initContext((Reveal as any).getState());

    Reveal.addEventListener("slidechanged", async (e: MolViewer.SlideNumber) => {
        viewer.setContext(e);
    });

    Reveal.addEventListener('fragmentshown', (e:any) => {
        let cam: string = null, vis: string = null;
        for (let frag of e.fragments) {
        let fCam = e.fragment.getAttribute('data-camera'),
            fVis = e.fragment.getAttribute('data-visible');

            if (typeof fCam === 'string') cam = fCam;
            if (typeof fVis === 'string') vis = fVis;
        }

        viewer.setScene(cam, vis);
    });

    Reveal.addEventListener('fragmenthidden', (e:any) => {
        let cam: string = null, vis: string = null;
        for (let frag of e.fragments) {
        let fCam = e.fragment.getAttribute('data-before-camera'),
            fVis = e.fragment.getAttribute('data-before-visible');

            if (typeof fCam === 'string') cam = fCam;
            if (typeof fVis === 'string') vis = fVis;
        }

        viewer.setScene(cam, vis);
    });
})();
