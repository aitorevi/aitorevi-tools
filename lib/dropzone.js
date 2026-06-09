// Cableado compartido del drag & drop de las herramientas.
//
// Unifica el comportamiento que antes se copiaba en cada app.js:
//  - clic / Enter / Espacio en la zona abre el selector de archivos
//  - se evita que el navegador abra el archivo al soltarlo en cualquier parte
//  - feedback visual (.dragover) mientras se arrastra sobre la zona
//  - soltar en cualquier punto de la ventana entrega el/los archivo(s)
//
// `onFiles` recibe un único File (modo por defecto) o el FileList completo
// (cuando `multiple: true`).

export function wireDropzone({ dropzone, input, onFiles, multiple = false }) {
  const deliver = (fileList) => {
    if (multiple) {
      onFiles(fileList);
    } else {
      const file = fileList && fileList[0];
      if (file) onFiles(file);
    }
  };

  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });

  // Evitar que el navegador abra el archivo si se suelta en cualquier parte de
  // la ventana (causa habitual de que el "drag & drop no funcione").
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
    window.addEventListener(evt, (e) => e.preventDefault())
  );

  // Feedback visual al arrastrar sobre la zona.
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.add("dragover"))
  );
  ["dragleave", "dragend"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove("dragover"))
  );

  // Soltar en cualquier punto de la ventana entrega el/los archivo(s).
  window.addEventListener("drop", (e) => {
    dropzone.classList.remove("dragover");
    deliver(e.dataTransfer?.files);
  });

  input.addEventListener("change", (e) => deliver(e.target.files));
}
