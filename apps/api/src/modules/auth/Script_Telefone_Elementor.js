<script>
  function formatPhoneNumber() {
    var inputZap2 = this;
    inputZap2.setAttribute('placeholder', '(00) 00000-0000');
    inputZap2.setAttribute('maxlength', '15');
    inputZap2.value = inputZap2.value.replace(/\D/g, '');
    inputZap2.value = inputZap2.value.replace(/^(\d{2})(\d)/g, '($1) $2');
    inputZap2.value = inputZap2.value.replace(/(\d)(\d{4})$/, '$1-$2');
  }
 
  function unformatPhoneNumber() {
    var inputZap2 = this;
    inputZap2.setAttribute('maxlength', '11');
    inputZap2.value = inputZap2.value.replace(/\D/g, '');
  }
 
  var inputs = document.querySelectorAll('#form-field-telefone');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener('focus', formatPhoneNumber);
    inputs[i].addEventListener('keyup', formatPhoneNumber);
    inputs[i].addEventListener('blur', unformatPhoneNumber);
  }
</script>