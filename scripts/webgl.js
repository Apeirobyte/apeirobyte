class ShaderPreview
{
	#gl;
	#shaderProgram;
	#vertexShader;
	#fragmentShader;
	#resolutionUniform;
	#timeUniform;
	#mouseUniform;
	#mouseClicksUniform;
	#mouseClickPositions;
	#customUniforms;

	static #vertexSource = `
		attribute vec4 a_position;
		void main() {
			gl_Position = a_position;
		}
	`;

	static #containerFragment = new Range().createContextualFragment(`
		<canvas>
			<p class="glerr">Your browser does not support canvas</p>
		</canvas>
		<p class="glerr" hidden></p>
	`);

	static #vertexPositions = new Float32Array([
		-1, -1, // 1
		 1, -1,
		 1,  1,
		-1, -1, // 2
		-1,  1,
		 1,  1,
	]);

	static #reservedUniforms = [
		"u_resolution",
		"u_time",
		"u_mouse",
		"u_mouseClickPositions"
	].reduce((map, key) => map[key] = map, {});

	static #resizeObserver = new ResizeObserver(entries => {
		for(const entry of entries)
		{
			const canvas = entry.target.querySelector("canvas");
			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
			entry.target.shader.draw();
		}
	});

	static getById(id)
	{
		return document.getElementById(id).shader;
	}

	constructor(container, url)
	{
		console.log(container);
		const matrixValues = () => this.#mouseClickPositions.flat().concat(Array(16).fill(-1)).slice(0, 16);

		container.appendChild(ShaderPreview.#containerFragment.cloneNode(true));
		container.shader = this;

		this.container = container;
		this.autoPlay = "shaderAutoPlay" in container.dataset;
		this.mouseEnabled = "shaderUseMouseUniforms" in container.dataset;
		this.canvas = container.querySelector("canvas");
		this.errorText = container.querySelector("div > .glerr");
		this.#gl = this.canvas.getContext("webgl");

		this.canvas.onmousemove = event => {
			if(!this.loaded || !this.mouseEnabled)
				return;

			this.#gl.uniform2f(this.#mouseUniform, event.offsetX, this.canvas.height - event.offsetY);
		};

		this.canvas.onmousedown = event => {
			if(!this.loaded || !this.mouseEnabled || this.#mouseClickPositions[0]?.[2] < 0)
				return;

			this.#mouseClickPositions.unshift([event.offsetX, this.canvas.height - event.offsetY, -1, -1]);
			if(this.#mouseClickPositions.length > 4)
				this.#mouseClickPositions.pop();

			this.#gl.uniformMatrix4fv(this.#mouseClicksUniform, false, matrixValues());
		};

		this.canvas.onmouseup = event => {
			if(!this.loaded || !this.mouseEnabled || this.#mouseClickPositions.length < 1 || this.#mouseClickPositions[0]?.[2] >= 0)
				return;

			this.#mouseClickPositions[0][2] = event.offsetX;
			this.#mouseClickPositions[0][3] = this.canvas.height - event.offsetY;
			
			this.#gl.uniformMatrix4fv(this.#mouseClicksUniform, false, matrixValues());
		};

		this.load(url).finally(() => ShaderPreview.#resizeObserver.observe(container));
	}

	load(url)
	{
		this.loaded = false;
		this.#mouseClickPositions = [];

		return new Promise(resolve => {
			if(!this.#gl)
				throw "Your browser does not support WebGL";

			this.#gl.deleteProgram(this.#shaderProgram);
			this.#gl.deleteShader(this.#vertexShader);
			this.#gl.deleteShader(this.#fragmentShader);

			url ??= this.container.dataset.shaderSrc;

			if(!url)
				throw "No source specified";

			const request = new XMLHttpRequest();
			request.open("GET", url);
			request.timeout = 30000;

			request.onloadend = () => {
				if(request.status == 0)
					throw "Fragment shader download timed out";
				else if(request.status != 200)
					throw "Failed to download fragment shader";

				this.#vertexShader = this.#gl.createShader(this.#gl.VERTEX_SHADER);
				this.#gl.shaderSource(this.#vertexShader, ShaderPreview.#vertexSource);
				this.#gl.compileShader(this.#vertexShader);
		
				if(!this.#gl.getShaderParameter(this.#vertexShader, this.#gl.COMPILE_STATUS))
				{
					console.error(this.#gl.getShaderInfoLog(this.#vertexShader));
					this.#gl.deleteShader(this.#vertexShader);
					throw "Failed to compile vertex shader";
				}

				this.#fragmentShader = this.#gl.createShader(this.#gl.FRAGMENT_SHADER);
				this.#gl.shaderSource(this.#fragmentShader, request.responseText);
				this.#gl.compileShader(this.#fragmentShader);
		
				if(!this.#gl.getShaderParameter(this.#fragmentShader, this.#gl.COMPILE_STATUS))
				{
					console.error(this.#gl.getShaderInfoLog(this.#fragmentShader));
					this.#gl.deleteShader(this.#vertexShader);
					this.#gl.deleteShader(this.#fragmentShader);
					throw "Failed to compile fragment shader";
				}
		
				this.#shaderProgram = this.#gl.createProgram();
				this.#gl.attachShader(this.#shaderProgram, this.#vertexShader);
				this.#gl.attachShader(this.#shaderProgram, this.#fragmentShader);
				this.#gl.linkProgram(this.#shaderProgram);
		
				if(!this.#gl.getProgramParameter(this.#shaderProgram, this.#gl.LINK_STATUS))
				{
					this.#gl.deleteShader(this.#vertexShader);
					this.#gl.deleteShader(this.#fragmentShader);
					this.#gl.deleteProgram(this.#shaderProgram);
					throw "Failed to link shader program";
				}
		
				const positionAttribute = this.#gl.getAttribLocation(this.#shaderProgram, "a_position");
				const positionBuffer = this.#gl.createBuffer();
				this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, positionBuffer);
				this.#gl.bufferData(this.#gl.ARRAY_BUFFER, ShaderPreview.#vertexPositions, this.#gl.STATIC_DRAW);
				this.#gl.enableVertexAttribArray(positionAttribute);
				this.#gl.vertexAttribPointer(positionAttribute, 2, this.#gl.FLOAT, false, 0, 0);
		
				this.#resolutionUniform = this.#gl.getUniformLocation(this.#shaderProgram, "u_resolution");
				this.#timeUniform = this.#gl.getUniformLocation(this.#shaderProgram, "u_time");
				this.#mouseUniform = this.#gl.getUniformLocation(this.#shaderProgram, "u_mouse");
				this.#mouseClicksUniform = this.#gl.getUniformLocation(this.#shaderProgram, "u_mouseClickPositions");
				this.#customUniforms = undefined;
		
				this.#gl.useProgram(this.#shaderProgram);

				for(const [key, value] of Object.entries(this.container.dataset))
					if(key.startsWith("uniform"))
						this.uniform(
							`u_${key.charAt(8).toLowerCase()}${key.substring(9)}`,
							key.charAt(7) == "F",
							...value.split(",").map(value => Number(value))
						)
				
				if(this.autoPlay)
					this.play();
				else
					this.draw(0);

				this.loaded = true;
				resolve();
			};

			request.send();
		}).catch(message => {
			this.#error(message);
			throw message;
		});
	}

	#error(message)
	{
		this.errorText.innerHTML = message;
		this.errorText.hidden = message == undefined;
		return message;
	}

	draw(time)
	{
		time ??= this.currentTime();

		if(this.container.shader == undefined)
			throw "";

		this.#gl.viewport(0, 0, this.#gl.drawingBufferWidth, this.#gl.drawingBufferHeight);
		this.#gl.clearColor(0, 0, 0, 1);
		this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);
		this.#gl.uniform2f(this.#resolutionUniform, this.canvas.width, this.canvas.height);
		this.#gl.uniform1f(this.#timeUniform, time);
		this.#gl.drawArrays(this.#gl.TRIANGLES, 0, 6);
	}

	uniform(name, float, ...values)
	{
		if(name in ShaderPreview.#reservedUniforms)
			throw `Can't manually change value of reserved uniform ${name}`;
		else if(values.length < 1)
			throw `No values specified for ${name}`;
		else if(values.length > 4)
			throw `${name} has more than 4 values`;
		else if(values.some(value => typeof value != "number" || isNaN(value)))
			throw `${name} has one or more non-numeric values`;

		values = float ? values : values.map(value => Math.trunc(value));

		this.#customUniforms ??= {};
		this.#customUniforms[name] ??= this.#gl.getUniformLocation(this.#shaderProgram, name);

		this.#gl[`uniform${values.length}${float ? "f" : "i"}v`](this.#customUniforms[name], values)
	}

	#nextFrame(timestamp)
	{
		this.draw((timestamp - this.startTimestamp) * .001);

		requestAnimationFrame(nextTimestamp => {
			if(this.pauseTimestamp == undefined)
				this.#nextFrame(nextTimestamp);
		})
	}

	play(time)
	{
		if(time != undefined)
			this.startTimestamp = document.timeline.currentTime - time * 1000;
		else if(this.startTimestamp == undefined)
			this.startTimestamp = document.timeline.currentTime;
		else if(this.pauseTimestamp != undefined)
			this.startTimestamp += document.timeline.currentTime - this.pauseTimestamp;

		this.pauseTimestamp = undefined;
		this.#nextFrame(this.startTimestamp);
	}

	pause()
	{
		this.pauseTimestamp = document.timeline.currentTime;
	}

	currentTime()
	{
		return ((this.pauseTimestamp ?? document.timeline.currentTime) - (this.startTimestamp ?? document.timeline.currentTime)) * .001;
	}
}

document.querySelectorAll(".glcontainer").forEach(element => new ShaderPreview(element));