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
    //audioElement.src = url;

    var audioContext = new AudioContext();
    var mediaStreamSource = audioContext.createMediaStreamSource(stream);
    var analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    //var analyser2 = audioContext.createAnalyser();
    //analyser2.fftSize = 512;
    //var gain = audioContext.createGain();
    //gain.gain.value = 0;  
    
    //var scrproc = audioContext.createScriptProcessor(512);

    //scrproc.onaudioprocess = Main.Process;
    //scrproc.connect(analyser);
    
    var filter = audioContext.createBiquadFilter();

    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    //var cepst = new Uint8Array(analyser2.frequencyBinCount);

    mediaStreamSource.connect(analyser);
    mediaStreamSource.channelInterpretation = "discrete";
    //gain.connect(AudioContext.destination);
    //gain.connect(filter);

    filter.type = 0; 
    filter.frequency.value = 800; 
    //filter.connect(analyser);
    //scrproc.connect(analyser);
    analyser.connect(audioContext.destination);
    //Main.src = mediaStreamSource;
    //Main.scrproc = scrproc;
    Main.analyser = analyser;
    //Main.analyser2 = analyser2;

    //Main.gain = gain;
    Main.data = frequencyData;
    //Main.cepst = cepst;
    //Main.buf1 = new Uint8Array(analyser2.frequencyBinCount);

    Main.thresholds = [500,500,500,500,500];
    Main.min = $('#min').val();
    Main.RedLimit = $('#red').val();
    Main.orangeLimit = $('#orange').val();
    Main.yellowLimit = $('#yellow').val();
    Main.blueLimit = $('#blue').val();
    Main.max = $('#max').val();
    //Main.index = 0;

    //init val of freq boundary
    $('#min').val(25);
    $('#red').val(35);
    $('#orange').val(41);
    $('#yellow').val(51);
    $('#green').val(59);
    $('#blue').val(68);
    
    $('#thres1').val(700);
    $('#thres2').val(700);
    $('#thres3').val(700);
    $('#thres4').val(700);
    $('#thres5').val(700);

    //arduino
    
    if (document.arduino) {
      Main.ports = [12, 11, 10, 9, 8];
      //arduino をオープン。引数はデバイスポートです。
      //document.arduino.open("/dev/cu.usbmodem1411");
      document.arduino.open("/dev/cu.usbmodemfa131"); 
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
    /* Process: function (ev) {　
        var buf0 = ev.outputBuffer.getChannelData(0);
        //Main.analyser2.getByteFrequencyData(Main.cepst);
        buf0 = Main.buf1;

    } ,
    */
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

    /*var analyser2 = Main.analyser2;
    var gain = Main.gain;
    analyser2.getByteFrequencyData(data);
    Main.cepst[Main.index] =data[$('index').val()];
    if(Main.index++ > 512){
        Main.index = 0;
        Main.buf1 = Main.cepst;
        Main.cepst = [];
      }
    */
    context.clearRect(0, 0, width, height);
    //context.beginPath();
    var wOfLine = width / data.length;
    for (var i = 0, n = data.length; i < n; i++) {
      var value = data[i];
      var x = i * wOfLine;
      var index = -1;
      if (i < $('#min').val()) {
        context.fillStyle = "gray";
      } else if (i < $('#red').val()) {
        index = 0;
        context.fillStyle = "red";
      } else if (i < $('#orange').val()) {
        index = 1;
        context.fillStyle = "orange";
      } else if (i < $('#yellow').val()) {
        index = 2;
        context.fillStyle = "yellow";
      } else if (i < $('#green').val()) {
        index = 3;
        context.fillStyle = "green";
      } else if (i < $('#blue').val()) {
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

    Main.thresholds[0] = $('#thres1').val();
    Main.thresholds[1] = $('#thres2').val();
    Main.thresholds[2] = $('#thres3').val();
    Main.thresholds[3] = $('#thres4').val();
    Main.thresholds[4] = $('#thres5').val();


    for (var i = 0; i < burreteCount; i++) {
      if (!Main.buretteElements[i]) {
        break;
      }
      if (Main.burettes[i] > Main.thresholds[i]) {
        $(Main.buretteElements[i]).css("background-color", "black")        
        if (document.arduino) {
          document.arduino.digitalWrite(Main.ports[i], true);
        }else console.log("not found arduino");
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