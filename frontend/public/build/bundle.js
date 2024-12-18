
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { console: console_1, document: document_1 } = globals;
    const file = "src/App.svelte";

    // (94:4) {#if selectedFile}
    function create_if_block_3(ctx) {
    	let button;
    	let i;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t = text("Process Image");
    			attr_dev(i, "class", "bi bi-gear-fill me-2");
    			add_location(i, file, 99, 5, 2726);
    			attr_dev(button, "class", "btn btn-glow btn-lg svelte-1gbgbnh");
    			button.disabled = /*loading*/ ctx[3];
    			add_location(button, file, 94, 4, 2620);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleSubmit*/ ctx[6], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*loading*/ 8) {
    				prop_dev(button, "disabled", /*loading*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(94:4) {#if selectedFile}",
    		ctx
    	});

    	return block;
    }

    // (107:1) {#if loading}
    function create_if_block_2(ctx) {
    	let div1;
    	let div0;
    	let span;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "Loading...";
    			attr_dev(span, "class", "visually-hidden");
    			add_location(span, file, 109, 4, 2940);
    			attr_dev(div0, "class", "spinner-border text-primary svelte-1gbgbnh");
    			attr_dev(div0, "role", "status");
    			add_location(div0, file, 108, 3, 2880);
    			attr_dev(div1, "class", "loading-overlay svelte-1gbgbnh");
    			add_location(div1, file, 107, 2, 2847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(107:1) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (115:1) {#if inputImage && !outputImage}
    function create_if_block_1(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = /*inputImage*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Input");
    			attr_dev(img, "class", "img-fluid rounded-4 shadow-lg");
    			add_location(img, file, 117, 3, 3120);
    			attr_dev(div0, "class", "col-md-10");
    			add_location(div0, file, 116, 2, 3093);
    			attr_dev(div1, "class", "row justify-content-center");
    			add_location(div1, file, 115, 1, 3050);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inputImage*/ 1 && !src_url_equal(img.src, img_src_value = /*inputImage*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(115:1) {#if inputImage && !outputImage}",
    		ctx
    	});

    	return block;
    }

    // (123:1) {#if inputImage && outputImage}
    function create_if_block(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div0 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div1 = element("div");
    			if (!src_url_equal(img0.src, img0_src_value = /*inputImage*/ ctx[0])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Input");
    			attr_dev(img0, "class", "img-fluid comparison-image svelte-1gbgbnh");
    			add_location(img0, file, 131, 6, 3531);
    			if (!src_url_equal(img1.src, img1_src_value = /*outputImage*/ ctx[1])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Output");
    			attr_dev(img1, "class", "comparison-image svelte-1gbgbnh");
    			add_location(img1, file, 136, 7, 3704);
    			attr_dev(div0, "class", "comparison-overlay svelte-1gbgbnh");
    			set_style(div0, "width", /*sliderPosition*/ ctx[2] + "%");
    			add_location(div0, file, 132, 6, 3609);
    			attr_dev(div1, "class", "slider-handle svelte-1gbgbnh");
    			set_style(div1, "left", /*sliderPosition*/ ctx[2] + "%");
    			add_location(div1, file, 138, 6, 3787);
    			attr_dev(div2, "class", "comparison-slider svelte-1gbgbnh");
    			add_location(div2, file, 126, 5, 3389);
    			attr_dev(div3, "class", "comparison-container rounded-4 shadow-lg svelte-1gbgbnh");
    			add_location(div3, file, 125, 4, 3329);
    			attr_dev(div4, "class", "col-md-10");
    			add_location(div4, file, 124, 3, 3301);
    			attr_dev(div5, "class", "row justify-content-center");
    			add_location(div5, file, 123, 2, 3257);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, img0);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, img1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "mousemove", /*handleSliderMove*/ ctx[7], false, false, false, false),
    					listen_dev(div2, "touchmove", prevent_default(/*handleSliderMove*/ ctx[7]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inputImage*/ 1 && !src_url_equal(img0.src, img0_src_value = /*inputImage*/ ctx[0])) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*outputImage*/ 2 && !src_url_equal(img1.src, img1_src_value = /*outputImage*/ ctx[1])) {
    				attr_dev(img1, "src", img1_src_value);
    			}

    			if (dirty & /*sliderPosition*/ 4) {
    				set_style(div0, "width", /*sliderPosition*/ ctx[2] + "%");
    			}

    			if (dirty & /*sliderPosition*/ 4) {
    				set_style(div1, "left", /*sliderPosition*/ ctx[2] + "%");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(123:1) {#if inputImage && outputImage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let script;
    	let script_src_value;
    	let link1;
    	let t0;
    	let main;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t2;
    	let label;
    	let i;
    	let t3;
    	let input;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let mounted;
    	let dispose;
    	let if_block0 = /*selectedFile*/ ctx[4] && create_if_block_3(ctx);
    	let if_block1 = /*loading*/ ctx[3] && create_if_block_2(ctx);
    	let if_block2 = /*inputImage*/ ctx[0] && !/*outputImage*/ ctx[1] && create_if_block_1(ctx);
    	let if_block3 = /*inputImage*/ ctx[0] && /*outputImage*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			script = element("script");
    			link1 = element("link");
    			t0 = space();
    			main = element("main");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Upload sketch";
    			t2 = space();
    			label = element("label");
    			i = element("i");
    			t3 = text("Choose Image\n\t\t\t\t\t");
    			input = element("input");
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			if (if_block2) if_block2.c();
    			t7 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(link0, "href", "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file, 72, 1, 1746);
    			if (!src_url_equal(script.src, script_src_value = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file, 73, 1, 1850);
    			attr_dev(link1, "href", "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css");
    			attr_dev(link1, "rel", "stylesheet");
    			add_location(link1, file, 74, 1, 1952);
    			attr_dev(h2, "class", "text-white mb-4 svelte-1gbgbnh");
    			add_location(h2, file, 81, 4, 2255);
    			attr_dev(i, "class", "bi bi-cloud-upload-fill me-2");
    			add_location(i, file, 83, 5, 2377);
    			attr_dev(input, "id", "fileInput");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", "image/*");
    			attr_dev(input, "class", "d-none");
    			add_location(input, file, 84, 5, 2439);
    			attr_dev(label, "class", "btn btn-outline-light btn-lg me-3");
    			attr_dev(label, "for", "fileInput");
    			add_location(label, file, 82, 4, 2306);
    			attr_dev(div0, "class", "upload-section p-5 bg-gradient rounded-4 shadow-lg svelte-1gbgbnh");
    			add_location(div0, file, 80, 3, 2186);
    			attr_dev(div1, "class", "col-md-8 text-center");
    			add_location(div1, file, 79, 2, 2148);
    			attr_dev(div2, "class", "row justify-content-center mb-5");
    			add_location(div2, file, 78, 1, 2100);
    			attr_dev(main, "class", "container py-5");
    			add_location(main, file, 77, 0, 2069);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link0);
    			append_dev(document_1.head, script);
    			append_dev(document_1.head, link1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, label);
    			append_dev(label, i);
    			append_dev(label, t3);
    			append_dev(label, input);
    			append_dev(div0, t4);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(main, t5);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t6);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t7);
    			if (if_block3) if_block3.m(main, null);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*handleFileSelect*/ ctx[5], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*selectedFile*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*loading*/ ctx[3]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(main, t6);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*inputImage*/ ctx[0] && !/*outputImage*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(main, t7);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*inputImage*/ ctx[0] && /*outputImage*/ ctx[1]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(main, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(script);
    			detach_dev(link1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function resizeImage(imageUrl, maxWidth = 800) {
    	return new Promise(resolve => {
    			const img = new Image();

    			img.onload = () => {
    				const canvas = document.createElement('canvas');
    				const ctx = canvas.getContext('2d');
    				let width = img.width;
    				let height = img.height;

    				if (width > maxWidth) {
    					height = maxWidth * height / width;
    					width = maxWidth;
    				}

    				canvas.width = width;
    				canvas.height = height;
    				ctx.drawImage(img, 0, 0, width, height);
    				resolve(canvas.toDataURL('image/jpeg', 0.9));
    			};

    			img.src = imageUrl;
    		});
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let inputImage = null;
    	let outputImage = null;
    	let sliderPosition = 50;
    	let loading = false;
    	let selectedFile = null;

    	async function handleFileSelect(event) {
    		$$invalidate(4, selectedFile = event.target.files[0]);

    		if (selectedFile) {
    			const tempUrl = URL.createObjectURL(selectedFile);
    			$$invalidate(0, inputImage = await resizeImage(tempUrl));
    			URL.revokeObjectURL(tempUrl);
    		}
    	}

    	async function handleSubmit() {
    		if (!selectedFile) return;
    		$$invalidate(3, loading = true);
    		const formData = new FormData();
    		formData.append('image', selectedFile);

    		try {
    			const response = await fetch('http://localhost:8086/api/process-image', { method: 'POST', body: formData });
    			const imageBlob = await response.blob();
    			const tempUrl = URL.createObjectURL(imageBlob);
    			$$invalidate(1, outputImage = await resizeImage(tempUrl));
    			URL.revokeObjectURL(tempUrl);
    		} catch(error) {
    			console.error('Error:', error);
    		} finally {
    			$$invalidate(3, loading = false);
    		}
    	}

    	function handleSliderMove(event) {
    		const rect = event.currentTarget.getBoundingClientRect();
    		const x = event.clientX - rect.left;
    		$$invalidate(2, sliderPosition = x / rect.width * 100);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		inputImage,
    		outputImage,
    		sliderPosition,
    		loading,
    		selectedFile,
    		resizeImage,
    		handleFileSelect,
    		handleSubmit,
    		handleSliderMove
    	});

    	$$self.$inject_state = $$props => {
    		if ('inputImage' in $$props) $$invalidate(0, inputImage = $$props.inputImage);
    		if ('outputImage' in $$props) $$invalidate(1, outputImage = $$props.outputImage);
    		if ('sliderPosition' in $$props) $$invalidate(2, sliderPosition = $$props.sliderPosition);
    		if ('loading' in $$props) $$invalidate(3, loading = $$props.loading);
    		if ('selectedFile' in $$props) $$invalidate(4, selectedFile = $$props.selectedFile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		inputImage,
    		outputImage,
    		sliderPosition,
    		loading,
    		selectedFile,
    		handleFileSelect,
    		handleSubmit,
    		handleSliderMove
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
