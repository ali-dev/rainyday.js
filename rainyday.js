/*
 * Copyright (c) 2013 Marek Brodziak
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Defines a new instance of the rainyday.js.
 * @param canvasid DOM id of the canvas used for rendering
 * @param sourceid DOM id of the image element used as background image
 * @param width width of the rendering
 * @param height height of the rendering
 * @param opacity opacity attribute value of the glass canvas (default: 0.9)
 * @param blur blur radius (default: 20)
 */

function RainyDay(canvasid, sourceid, width, height, opacity, blur) {
	this.canvasid = canvasid;
	this.canvas = document.getElementById(canvasid);

	this.sourceid = sourceid;
	this.img = document.getElementById(sourceid);

	// draw and blur the backgroiund image
	this.prepareBackground(blur ? blur : 20, width, height);
	this.w = this.canvas.width;
	this.h = this.canvas.height;

	// create the glass canvas
	this.prepareGlass(opacity ? opacity : 0.9);

	// assume default reflection mechanism
	if (!this.reflection) {
		this.reflection = this.REFLECTION_MINIATURE;
	}

	// assume default trail mechanism
	if (!this.trail) {
		this.trail = this.TRAIL_DROPS;
	}

	// assume default gravity
	if (!this.gravity) {
		this.gravity = this.GRAVITY_NONE;
	}

	// prepare canvas for drop reflections
	if (this.reflection != this.REFLECTION_NONE) {
		this.prepareReflections();
	}
}

/**
 * Create the helper canvas for rendering raindrop reflections.
 */
RainyDay.prototype.prepareReflections = function() {
	// new canvas
	this.reflected = document.createElement('canvas');
	this.reflected.width = this.canvas.width / 2;
	this.reflected.height = this.canvas.height / 2;

	var ctx = this.reflected.getContext('2d');

	// rotate by 180 degress
	ctx.translate(this.reflected.width / 2, this.reflected.height / 2);
	ctx.rotate(Math.PI);

	ctx.drawImage(this.img, -this.reflected.width / 2, -this.reflected.height / 2, this.reflected.width, this.reflected.height);
};

/**
 * Create the glass canvas and position it directly over the main one.
 * @param opacity opacity attribute value of the glass canvas
 */
RainyDay.prototype.prepareGlass = function(opacity) {
	this.glass = document.createElement('canvas');
	this.glass.width = this.canvas.width;
	this.glass.height = this.canvas.height;
	this.glass.style.position = "absolute";
	this.glass.style.top = this.canvas.offsetTop;
	this.glass.style.left = this.canvas.offsetLeft;
	this.glass.style.zIndex = this.canvas.style.zIndex + 100;
	this.canvas.parentNode.appendChild(this.glass);
	this.context = this.glass.getContext('2d');
	this.glass.style.opacity = opacity;
};

/**
 * Creates a new preset object with given attributes.
 * @param min minimum size of a drop
 * @param base base value for randomizing drop size
 * @param quan probability of selecting this preset (must be between 0 and 1)
 * @returns present object with given attributes
 */
RainyDay.prototype.preset = function(min, base, quan) {
	return {
		"min": min,
		"base": base,
		"quan": quan
	}
};

/**
 * Main function for starting rain rendering.
 * @param presets list of presets to be applied
 * @param speed speed of the animation (if not provided or 0 static image will be generated)
 */
RainyDay.prototype.rain = function(presets, speed) {
	if (speed > 0) {
		// animation
		this.presets = presets;
		setInterval(
			(function(self) {
				return function() {
					var random = Math.random();
					// select matching preset
					var preset;
					for (var i = 0; i < presets.length; i++) {
						if (random < presets[i].quan) {
							preset = presets[i];
							break;
						}
					}
					if (preset) {
						self.putDrop(new Drop(self, Math.random() * self.w, Math.random() * self.h, preset.min, preset.base));
					}
				}
			})(this),
			speed
		);
	} else {
		// static picture
		for (var i = 0; i < presets.length; i++) {
			var preset = presets[i];
			for (var c = 0; c < preset.quan; ++c) {
				this.putDrop(new Drop(this, Math.random() * this.w, Math.random() * this.h, preset.min, preset.base));
			}
		}
	}
};

/**
 * Adds a new raindrop to the animation.
 * @param drop drop object to be added to the animation
 */
RainyDay.prototype.putDrop = function(drop) {
	drop.draw();
	if (this.gravity) {
		drop.animate();
	}
};

/**
 * Imperfectly approximates shape of a circle.
 * @param iterations number of iterations applied to the size approximation algorithm
 * @returns list of points approximating a circle shape
 */
RainyDay.prototype.getLinepoints = function(iterations) {
	var pointList = {};
	pointList.first = {
		x: 0,
		y: 1
	};
	var lastPoint = {
		x: 1,
		y: 1
	}
	var minY = 1;
	var maxY = 1;
	var point;
	var nextPoint;
	var dx, newX, newY;

	pointList.first.next = lastPoint;
	for (var i = 0; i < iterations; i++) {
		point = pointList.first;
		while (point.next != null) {
			nextPoint = point.next;

			dx = nextPoint.x - point.x;
			newX = 0.5 * (point.x + nextPoint.x);
			newY = 0.5 * (point.y + nextPoint.y);
			newY += dx * (Math.random() * 2 - 1);

			var newPoint = {
				x: newX,
				y: newY
			};

			//min, max
			if (newY < minY) {
				minY = newY;
			} else if (newY > maxY) {
				maxY = newY;
			}

			//put between points
			newPoint.next = nextPoint;
			point.next = newPoint;

			point = nextPoint;
		}
	}

	//normalize to values between 0 and 1
	if (maxY != minY) {
		var normalizeRate = 1 / (maxY - minY);
		point = pointList.first;
		while (point != null) {
			point.y = normalizeRate * (point.y - minY);
			point = point.next;
		}
	} else {
		point = pointList.first;
		while (point != null) {
			point.y = 1;
			point = point.next;
		}
	}

	return pointList;
};

/**
 * Defines a new raindrop object.
 * @param rainyday reference to the parent object
 * @param centerX x position of the center of this drop
 * @param centerY y position of the center of this drop
 * @param min minimum size of a drop
 * @param base base value for randomizing drop size
 */

function Drop(rainyday, centerX, centerY, min, base) {
	this.x = Math.floor(centerX);
	this.y = Math.floor(centerY);
	this.r1 = (Math.random() * base) + min;
	this.rainyday = rainyday;
	var iterations = 5;
	this.r2 = 0.88 * this.r1;
	this.linepoints = rainyday.getLinepoints(iterations);
	this.context = rainyday.context;
	this.reflection = rainyday.reflected;
}

/**
 * Draws a raindrop on canvas at the current position.
 */
Drop.prototype.draw = function() {
	var phase = 0;
	var point;
	var rad, theta;
	var x0, y0;

	this.context.save();
	this.context.beginPath();
	point = this.linepoints.first;
	theta = phase;
	rad = this.r2 + point.y * (this.r1 - this.r2);
	x0 = this.x + rad * Math.cos(theta);
	y0 = this.y + rad * Math.sin(theta);
	this.context.lineTo(x0, y0);
	while (point.next != null) {
		point = point.next;
		theta = (Math.PI * 2 * point.x) + phase;
		rad = this.r2 + point.y * (this.r1 - this.r2);
		x0 = this.x + rad * Math.cos(theta);
		y0 = this.y + rad * Math.sin(theta);
		this.context.lineTo(x0, y0);
	}

	this.context.clip();

	if (this.rainyday.reflection) {
		this.rainyday.reflection(this);
	} else {

	}

	this.context.restore();
};

/**
 * Moves the raindrop to a new position according to the gravity.
 */
Drop.prototype.animate = function() {
	this.intid = setInterval(
		(function(self) {
			return function() {
				if (self.rainyday.gravity) {
					var stopped = self.rainyday.gravity(self);
					if (!stopped) {
						if (self.rainyday.trail) {
							self.rainyday.trail(self);
						}
					}
				}
			}
		})(this),
		10
	);
};

/**
 * TRAIL function: no trail at all
 * @param drop raindrop object
 */
RainyDay.prototype.TRAIL_NONE = function(drop) {
	// nothing going on here
};

/**
 * TRAIL function: trail of small drops (default)
 * @param drop raindrop object
 */
RainyDay.prototype.TRAIL_DROPS = function(drop) {
	if (!drop.trail_y || drop.y - drop.trail_y >= Math.random() * 10 * drop.r1) {
		drop.trail_y = drop.y;
		this.putDrop(new Drop(this, drop.x, drop.y - drop.r1 - 5, 0, Math.ceil(drop.r1 / 5)));
	}
};

/**
 * GRAVITY function: no gravity at all
 * @param drop raindrop object
 * @returns true if the drop animation is stopped
 */
RainyDay.prototype.GRAVITY_NONE = function(drop) {
	// nothing going on here
};

/**
 * GRAVITY function: simple gravity
 * @param drop raindrop object
 * @returns true if the drop animation is stopped
 */
RainyDay.prototype.GRAVITY_SIMPLE = function(drop) {
	if (drop.r1 < 3) { // size threshold
		clearInterval(drop.intid);
		return true;
	}
	this.context.clearRect(drop.x - drop.r1 - 1, drop.y - drop.r1 - 1, 2 * drop.r1 + 2, 2 * drop.r1 + 2);
	if (drop.y - drop.r1 > this.glass.height) {
		clearInterval(drop.intid);
		return true;
	}

	if (drop.speed) {
		drop.speed += 0.005 * Math.floor(drop.r1);
	} else {
		drop.speed = 0.1;
	}
	drop.y += drop.speed;
	drop.draw();

	return false;
};

/**
 * REFLECTION function: no reflection at all
 * @param drop raindrop object
 */
RainyDay.prototype.REFLECTION_NONE = function(drop) {
	this.context.fillStyle = '#8ED6FF';
	this.context.fill();
};

/**
 * REFLECTION function: miniature reflection
 * @param drop raindrop object
 */
RainyDay.prototype.REFLECTION_MINIATURE = function(drop) {
	var mx = (drop.x * this.reflected.width) / this.glass.width;
	var my = (drop.y * this.reflected.height) / this.glass.height;
	var mw = drop.r1 * 10;
	var mh = drop.r1 * 10;

	this.context.drawImage(this.reflected, (mx - mw) < 0 ? 0 : (mx - mw), (my - mh) < 0 ? 0 : (my - mh),
		mw * 2, mh * 2, drop.x - drop.r1, drop.y - drop.r1, 2 * drop.r1, 2 * drop.r1);
};

var mul_table = [
	512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
	454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
	482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
	437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
	497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
	320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
	446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
	329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
	505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
	399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
	324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
	268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
	451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
	385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
	332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
	289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
];

var shg_table = [
	9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
	17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
	19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
	20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
];

/**
 * Resizes canvas, draws original image and applies bluring algorithm.
 * @param radius blur radius to be applied
 * @param width width of the canvas
 * @param height height of the canvas
 */
RainyDay.prototype.prepareBackground = function(radius, width, height) {
	if (width && height) {
		this.canvas.style.width = width + "px";
		this.canvas.style.height = height + "px";
		this.canvas.width = width;
		this.canvas.height = height;
	} else {
		width = this.canvas.width;
		height = this.canvas.height;
	}

	var context = this.canvas.getContext("2d");
	context.clearRect(0, 0, width, height);
	context.drawImage(this.img, 0, 0, width, height);

	if (isNaN(radius) || radius < 1) return;

	this.stackBlurCanvasRGB(0, 0, width, height, radius);
};

/**
 * Implements the Stack Blur Algorithm (@see http://www.quasimondo.com/StackBlurForCanvas/StackBlurDemo.html).
 * @param top_x x of top-left corner of the blurred rectangle
 * @param top_y y of top-left corner of the blurred rectangle
 * @param width width of the canvas
 * @param height height of the canvas
 * @param radius blur radius
 */
RainyDay.prototype.stackBlurCanvasRGB = function(top_x, top_y, width, height, radius) {
	radius |= 0;

	var context = this.canvas.getContext("2d");
	var imageData = context.getImageData(top_x, top_y, width, height);

	var pixels = imageData.data;

	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
		r_out_sum, g_out_sum, b_out_sum,
		r_in_sum, g_in_sum, b_in_sum,
		pr, pg, pb, rbs;

	var div = radius + radius + 1;
	var w4 = width << 2;
	var widthMinus1 = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1 = radius + 1;
	var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

	var stackStart = new BlurStack();
	var stack = stackStart;
	for (i = 1; i < div; i++) {
		stack = stack.next = new BlurStack();
		if (i == radiusPlus1) var stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;

	yw = yi = 0;

	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];

	for (y = 0; y < height; y++) {
		r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		for (i = 1; i < radiusPlus1; i++) {
			p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
			r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;
		}

		stackIn = stackStart;
		stackOut = stackEnd;
		for (x = 0; x < width; x++) {
			pixels[yi] = (r_sum * mul_sum) >> shg_sum;
			pixels[yi + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[yi + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

			r_in_sum += (stackIn.r = pixels[p]);
			g_in_sum += (stackIn.g = pixels[p + 1]);
			b_in_sum += (stackIn.b = pixels[p + 2]);

			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}


	for (x = 0; x < width; x++) {
		g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

		yi = x << 2;
		r_out_sum = radiusPlus1 * (pr = pixels[yi]);
		g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
		b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);

		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;

		stack = stackStart;

		for (i = 0; i < radiusPlus1; i++) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}

		yp = width;

		for (i = 1; i <= radius; i++) {
			yi = (yp + x) << 2;

			r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
			g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
			b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;

			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;

			stack = stack.next;

			if (i < heightMinus1) {
				yp += width;
			}
		}

		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for (y = 0; y < height; y++) {
			p = yi << 2;
			pixels[p] = (r_sum * mul_sum) >> shg_sum;
			pixels[p + 1] = (g_sum * mul_sum) >> shg_sum;
			pixels[p + 2] = (b_sum * mul_sum) >> shg_sum;

			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;

			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;

			p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

			r_sum += (r_in_sum += (stackIn.r = pixels[p]));
			g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
			b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));

			stackIn = stackIn.next;

			r_out_sum += (pr = stackOut.r);
			g_out_sum += (pg = stackOut.g);
			b_out_sum += (pb = stackOut.b);

			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;

			stackOut = stackOut.next;

			yi += width;
		}
	}

	context.putImageData(imageData, top_x, top_y);

};

/**
 * Defines a new helper object for Stack Blur Algorithm.
 */

function BlurStack() {
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 0;
	this.next = null;
}