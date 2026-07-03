/// imagem carregada pelo usuário:
var zoomer2 = (function () {
    var img_ele = null,
        //x_cursor = 0,
        //y_cursor = 0,
        x_img_ele = 0,
        y_img_ele = 0,
        //orig_width = document.getElementById('img_added').getBoundingClientRect().width,
        //orig_height = document.getElementById('img_added').getBoundingClientRect().height,
        orig_width  = document.getElementById('img_added').width,
        orig_height = document.getElementById('img_added').height,
        current_top = 0,
        current_left = 0,
        zoom_factor = 1.0;
        zoom_ant = null;

    return {
        zoom2: function (zoomincrement) {
            
            img_ele = document.getElementById('img_added');
            console.log(img_ele);
            
            if ((zoom_ant > 0 && zoomincrement < 0) || (zoom_ant < 0 && zoomincrement > 0)){zoom_factor = 1.0;} 

            zoom_factor = zoom_factor + zoomincrement;
            zoom_ant = zoomincrement;           

            //console.log('zoom_factor: ' + zoom_factor);

            if (img_ele.width <= 373 && zoomincrement <= 0 )//  (zoom_factor <= 0.0)
            {                               
                    //alert('freio');
                    //console.log('img_ele.width: ' + img_ele.width);
                                        
                    zoom_factor = 1.0;
                    img_ele.style.top =  '0px';    
                    img_ele.style.left = '0px';
                    img_ele.style.width  = '373px';
                    img_ele.style.height = '498px';
            } else {

               // console.log('img_ele.width: ' + img_ele.width);


                    var //pre_width  = img_ele.getBoundingClientRect().width, 
                        //pre_height = img_ele.getBoundingClientRect().height;
                        pre_width  = img_ele.width, 
                        pre_height = img_ele.height;

                    var new_width = (pre_width * zoom_factor);
                    var new_heigth = (pre_height * zoom_factor);

                    if (current_left < (orig_width - new_width))
                    {
                        current_left = (orig_width - new_width);
                    }
                    if (current_top < (orig_height - new_heigth))
                    {
                        current_top = (orig_height - new_heigth);
                    }

                    if (new_width < 373 || new_heigth < 498){
                        new_width = 373;
                        new_heigth = 498;
                        current_left = 0;
                        current_top = 0;
                    }    

                    img_ele.style.left = current_left + 'px';
                    img_ele.style.top = current_top + 'px';
                    img_ele.style.width = new_width + 'px';
                    img_ele.style.height = new_heigth + 'px';
                }       
            img_ele = null;
        },

        start_drag2: function () {
        if (zoom_factor <= 0.0)
        {
            return;
        }
        img_ele = this;
        x_img_ele = window.event.clientX - document.getElementById('img_added').offsetLeft;
        y_img_ele = window.event.clientY - document.getElementById('img_added').offsetTop;
        },

        stop_drag2: function () {
        if (img_ele !== null) {
            if (zoom_factor <= 0.0)
            {
            img_ele.style.left = '0px';
            img_ele.style.top =  '0px';      
            }
            }
        img_ele = null;
        },

        while_drag2: function () {
            if (img_ele !== null)
            {
                var x_cursor = window.event.clientX;
                var y_cursor = window.event.clientY;
                var new_left = (x_cursor - x_img_ele);
                if (new_left > 0)
                {
                    new_left = 0;
                }
                if (new_left < (orig_width - img_ele.width))
                {
                    new_left = (orig_width - img_ele.width);
                }
                var new_top = ( y_cursor - y_img_ele);
                if (new_top > 0)
                {
                    new_top = 0;
                }
                if (new_top < (orig_height - img_ele.height))
                {
                    new_top = (orig_height - img_ele.height);
                }
                current_left = new_left;
                img_ele.style.left = new_left + 'px';
                current_top = new_top;
                img_ele.style.top = new_top + 'px';
            }
        }
    };
} ());        

