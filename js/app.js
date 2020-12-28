$(document).ready(function () {
    var colour = $(".selected").css("background-color");
    var $canvas = $("canvas");
    var context = $canvas[0].getContext("2d");
    var lastEvent;
    var mouseDown = false;
    var insideSensor = false;
    var smallImageData;

    var points = []

    var bbox = [0, 0, 0, 0]
    var sensor = [0, 0, 0, 0]
    const label = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// When clicking on colours items
    $(".controls").on("click", "li", function () {
        //  Deselect aibling elements
        $(this).siblings().removeClass("selected");
        //  Select clicked element
        $(this).addClass("selected");

        // Cache current colour
        colour = $(this).css("background-color");
    });

    async function load_model() {
        let model = await tf.loadLayersModel('http://localhost:63343/other/hwjs.model/model.json');
        // let model = await tf.loadLayersModel('http://localhost:63343/other/hw.model.resnet.js/model.json');
        return model;
    }

    const model = load_model();

// On mouse events on the canvas
    $canvas.mousedown(function (e) {
        lastEvent = e;
        mouseDown = true;
        insideSensor = true;
        points.push([e.offsetX, e.offsetY]);
    }).mousemove(function (e) {
        // Draw lines
        if (mouseDown) {
            context.beginPath();
            context.moveTo(lastEvent.offsetX, lastEvent.offsetY);
            context.lineTo(e.offsetX, e.offsetY);
            context.strokeStyle = colour;
            context.lineWidth = 5;
            context.lineCap = 'round';
            context.stroke();
            lastEvent = e;
            points.push([e.offsetX, e.offsetY]);
        } else {
        }
    }).mouseup(async function () {
        mouseDown = false;
        let im;
        let model_out;
        if (check_input(points)) {
            im = renderImage(points);
            context.putImageData(smallImageData, 0, 0);
            let src = tf.tensor(im);
            src = src.reshape([1, 32, 32, 1]);
            try {
                let mdl = await model;
                model_out = await mdl.predict(src);
            } catch(error) {
                console.error(error);
            }
            let output_text = label[model_out.argMax(1).dataSync()[0]];
            console.log(output_text);

            eraseLastSegment(points);

            context.font = (bbox[3] * 1.3).toString() + "px Arial";
            context.fillText(output_text, bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2);
            // context.strokeText()
        }
        points = [];

    }).mouseleave(function () {
        $canvas.mouseup();
    });

    function eraseLastSegment(arr) {
        for (let j = 0; j < arr.length; j += 1) {
            let x = arr[j][0];
            let y = arr[j][1];
            if (j == 0) {
                [lastX, lastY] = [x, y];
            }
            context.strokeStyle = 'white';
            context.lineCap = 'round';
            context.moveTo(lastX, lastY);
            context.lineTo(x, y);
            context.stroke();
            [lastX, lastY] = [x, y]
        }
    }

    function check_input(arr) {
        // let min_x, min_y, max_x, max_y;
        let min_x, min_y, w, h;
        [min_x, min_y, w, h] = get_bbox(arr);
        // let w = max_x - min_x;
        // let h = max_y - min_y;
        if (w > 200) return false;
        if (h > 200) return false;
        if (w < 10) return false;
        if (h < 10) return false;
        bbox = [min_x, min_y, w, h];
        sensor = get_sensor(bbox);
        return true;
    }

    function get_bbox(arr) {
        let max_x = Math.max.apply(Math, arr.map(function (o) {
            return o[0];
        }));
        let min_x = Math.min.apply(Math, arr.map(function (o) {
            return o[0];
        }));
        let max_y = Math.max.apply(Math, arr.map(function (o) {
            return o[1];
        }));
        let min_y = Math.min.apply(Math, arr.map(function (o) {
            return o[1];
        }));
        return [min_x, min_y, max_x - min_x, max_y - min_y]
    }

    function get_sensor(bbox) {
        let l, t, w, h;
        [l, t, w, h] = bbox;
        let cx = Math.round(l + w / 2);
        let cy = Math.round(t + h / 2);
        let halfside = Math.round(Math.max(w, h) * 0.6);
        // t = cy - halfside;
        // l = cx - halfside;
        // h = halfside * 2;
        // w = halfside * 2;
        return [cx - halfside, cy - halfside, halfside * 2, halfside * 2];
    }

    function check_inside_sensor(x, y, sensor) {
        let t, l, w, h = sensor;
        if (x < l) return false;
        if (y < t) return false;
        if (x > l + w) return false;
        if (y > t + h) return false;
        return true;
    }

    function renderImage(arr) {
        const canvas = document.createElement('canvas');
        canvas.id = 'runtime-canvas';
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.beginPath()
        let bbox = get_bbox(arr);
        let sensor = get_sensor(bbox);
        let lastX, lastY;
        for (let j = 0; j < arr.length; j += 1) {
            let x = Math.round((arr[j][0] - sensor[0]) * 32 / sensor[2]);
            let y = Math.round((arr[j][1] - sensor[1]) * 32 / sensor[3]);
            if (j == 0) {
                [lastX, lastY] = [x, y];
            }
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.fillRect(0, 0, 32, 32);
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            [lastX, lastY] = [x, y]
        }

        smallImageData = ctx.getImageData(0, 0, 32, 32);
        const data = smallImageData.data;
        let result = []
        for (let i = 0; i < data.length; i += 4) {
            result.push((data[i + 2] > 100) ? 1 : 0);
        }
        return result;
    }

})

// Clear the canvas when button is clicked
function clear_canvas_width() {
    var s = document.getElementById("mainCanvas");
    var w = s.width;
    s.width = 10;
    s.width = w;
}