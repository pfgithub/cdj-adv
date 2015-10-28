$("#passConf").change(function(event){
  setTimeout(function(){
    if($("#passConf").val() == $("#pass").val()){
      $("#passConf").addClass("good");
    }else{
      $("#passConf").addClass("error");
      $("#passConf").removeClass("good");
    }}
  ,5);

});
