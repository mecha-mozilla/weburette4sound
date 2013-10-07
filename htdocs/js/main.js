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

    var filter = audioContext.createBiquadFilter();
    var frequencyData = new Uint8Array(analyser.frequencyBinCount);

    mediaStreamSource.connect(analyser);
    mediaStreamSource.channelInterpretation = "discrete";
    
    filter.type = 0; 
    filter.frequency.value = 800; 
    analyser.connect(audioContext.destination);
    Main.analyser = analyser;
    Main.data = frequencyData;

    Main.thresholds = [500,500,500,500,500];
    Main.min = $('#min').val();
    Main.RedLimit = $('#red').val();
    Main.orangeLimit = $('#orange').val();
    Main.yellowLimit = $('#yellow').val();
    Main.blueLimit = $('#blue').val();
    Main.max = $('#max').val();
    Main.lefts = [0,0,0,0,0];

    //init val of freq boundary and threshold
    $('#min').val(25);
    $('#red').val(30);
    $('#orange').val(40);
    $('#yellow').val(50);
    $('#green').val(60);
    $('#blue').val(70);
    

    //valves controller param
    Main.onCounter = [0,0,0,0,0];
    Main.offCounter = [0,0,0,0,0];
    Main.thresIDs = ['#thres1','#thres2','#thres3','#thres4','#thres5'];
    Main.meterIDs = ['#meter1','#meter2','#meter3','#meter4','#meter5'];

    //arduino
    
    if (document.arduino) {
      //Main.ports = [12, 8, 10, 9, 11];
      Main.ports = [11,9,10,8,12];

      //arduino をオープン。引数はデバイスポートです。
      //document.arduino.open("/dev/cu.usbmodemfa131");
      document.arduino.open("/dev/cu.usbmodemfd111"); 
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

    var alchol = false;
    if($('#alchol:checked').val() == "on") alchol = true;  
    if(alchol)Main.thresholds[0] = 2000;
    else Main.thresholds[0] = 486; 


    var openedValves = [];

    for (var i = 0; i < burreteCount; i++) {
      if (!Main.buretteElements[i]) {
        break;
      }
      if (Main.burettes[i] > Main.thresholds[i]) {
        openedValves.push(i);
        Main.onCounter[i]++;
        Main.offCounter[i]=0;
        Main.lefts[i]+=0.1;
        $(Main.buretteElements[i]).css("background-color", "black")        
        if (document.arduino) {
          document.arduino.digitalWrite(Main.ports[i], true);
        }//else console.log("not found arduino");
      } else {
        Main.onCounter[i]=0;
        Main.offCounter[i]++;
        $(Main.buretteElements[i]).css("background-color", "gray")        
        if (document.arduino) {
          document.arduino.digitalWrite(Main.ports[i], false);
        }
      }
      $(Main.meterIDs[i]).css("height",Main.lefts[i]);
      Main.buretteElements[i].textContent = Main.burettes[i];
      

      //valve cleaning
      if (document.arduino&&$('#cleaning:checked').val() == "on") {
        document.arduino.digitalWrite(Main.ports[i], true);
      }


      var auto = false;
      if($('#auto:checked').val() == "on")auto = true;  
      if(auto){
        //valves Controll
        //しばらく開いてるバルブの閾値を上げ、しばらく閉じてるバルブの閾値を下げることによって
         //特定のバルブだけずっと開きっぱなしとかさせない
        if(Main.onCounter[i]>15 &&openedValves<3){ 
           $(Main.thresIDs[i]).val(Number(Main.thresholds[i])+80);     
           Main.onCounter[i] = 0;
        }
        if(Main.offCounter[i]>30&&openedValves<3){ 
          $(Main.thresIDs[i]).val(Number(Main.thresholds[i])-80);     
          Main.offCounter[i] = 0;
        }


        //一番出してるビュレットの閾値を遠くへすっ飛ばしてしばらく開かないようにする      
        //sort burettes
        var first = 0;
        for(var k=1; k<5; k++){
            if(Main.lefts[k] > Main.lefts[first])first = k;
        }
        if(openedValves.length > 3)
           $(Main.thresIDs[first]).val(Number(Main.thresholds[first])+Math.random()*800);
      }
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