/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var Main = {
  init: function() {
    //navigator のセットしないと動かない。なぜ？？
    navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    navigator.getMedia({ audio: true }, Main.setup, Main.error);
  },

  setup: function(stream) {
    Main.burettes = [0, 0, 0, 0, 0];//5 fires
    Main.buretteElements = [];
    Main.buretteElements[0] = document.getElementById("burette1");
    Main.buretteElements[1] = document.getElementById("burette2");
    Main.buretteElements[2] = document.getElementById("burette3");
    Main.buretteElements[3] = document.getElementById("burette4");
    Main.buretteElements[4] = document.getElementById("burette5");

    var audioElement = document.getElementById("audio");
    var url = URL.createObjectURL(stream);
    audioElement.src = url;

    var audioContext = new AudioContext();
    var mediaStreamSource = audioContext.createMediaStreamSource(stream);
    var analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    mediaStreamSource.connect(analyser);

    Main.analyser = analyser;
    Main.data = frequencyData;

    //arduino
    if (document.arduino) {
      Main.ports = [12, 11, 10, 9, 8];
      //arduino をオープン。引数はデバイスポートです。
      document.arduino.open("/dev/cu.usbmodem1411");
      //ピンを出力に設定 (true: OUTPUT, false: INPUT)
      for (var i = 0, n = Main.ports.length; i < n; i++) {
        document.arduino.pinMode(Main.ports[i], true);
      }
    }

    //visual
    Main.canvasWidth = frequencyData.length * 5;
    Main.canvasHeight = 300;
    var element = document.getElementById("visual");
    var context = element.getContext("2d");
    element.setAttribute("width", Main.canvasWidth);
    element.setAttribute("height", Main.canvasHeight);
    Main.context = context;

    Main.update();
  },

  update: function() {
    //clear burette
    var burreteCount = Main.burettes.length;
    for (var i = 0; i < burreteCount; i++) {
      Main.burettes[i] = 0;
    }

    var context = Main.context;
    var width = Main.canvasWidth;
    var height = Main.canvasHeight;
    var data = Main.data;
    var analyser = Main.analyser;

    analyser.getByteFrequencyData(data);

    context.clearRect(0, 0, width, height);
    //context.beginPath();
    var wOfLine = width / data.length;
    for (var i = 0, n = data.length; i < n; i++) {
      var value = data[i];
      var x = i * wOfLine;

      var index = -1;
      if (i < 100) {
        context.fillStyle = "gray";
      } else if (i < 120) {
        index = 0;
        context.fillStyle = "red";
      } else if (i < 140) {
        index = 1;
        context.fillStyle = "orange";
      } else if (i < 160) {
        index = 2;
        context.fillStyle = "yellow";
      } else if (i < 180) {
        index = 3;
        context.fillStyle = "green";
      } else if (i < 200) {
        index = 4;
        context.fillStyle = "blue";
      } else {
        context.fillStyle = "gray";
      }

      context.fillRect(x, height-value, wOfLine, value);

//      var index = Math.floor(i / (burreteCount*0.01));
//      if (index == burreteCount) {
//        index = burreteCount-1;
//      }
      if (index == -1) {
        continue;
      }
      Main.burettes[index] += value;
    }

    for (var i = 0; i < burreteCount; i++) {
      if (!Main.buretteElements[i]) {
        break;
      }
      if (Main.burettes[i] > 1000) {
        $(Main.buretteElements[i]).css("background-color", "black")        
        if (document.arduino) {
          document.arduino.digitalWrite(Main.ports[i], true);
        }
      } else {
        $(Main.buretteElements[i]).css("background-color", "gray")        
        if (document.arduino) {
          document.arduino.digitalWrite(Main.ports[i], false);
        }
      }
      Main.buretteElements[i].textContent = Main.burettes[i];
    }

    requestAnimationFrame(Main.update);
  },

  error: function(message) {
    alert(message);
  }
};

$(document).ready(function() {
  Main.init();
});