import SwiftUI
import UIKit

/// Campo de texto com máscara aplicada tecla a tecla.
///
/// Por que UIKit e não `TextField` puro: aplicar máscara reatribuindo o texto
/// dentro do `.onChange` do TextField faz o SwiftUI brigar com o estado interno
/// do campo — em digitação rápida (ou ao COLAR um CPF) os caracteres se perdem.
/// Foi exatamente o que aconteceu: digitar "58088636353" resultava em "580.8".
/// Com `UITextField` + delegate, a formatação acontece no ponto certo do ciclo
/// de edição e nenhum caractere é descartado. É o equivalente ao
/// `VisualTransformation` do Compose no app Android.
struct MaskedTextField: UIViewRepresentable {
    @Binding var text: String
    var placeholder: String = ""
    var keyboard: UIKeyboardType = .default
    var isSecure: Bool = false
    /// Recebe o texto cru e devolve o texto já formatado.
    var mask: (String) -> String

    func makeUIView(context: Context) -> UITextField {
        let tf = UITextField()
        tf.placeholder = placeholder
        tf.keyboardType = keyboard
        tf.isSecureTextEntry = isSecure
        tf.autocorrectionType = .no
        tf.autocapitalizationType = .none
        tf.font = .systemFont(ofSize: 16)
        tf.textColor = UIColor(Atlas.ink)
        tf.delegate = context.coordinator
        tf.addTarget(context.coordinator, action: #selector(Coordinator.editingChanged(_:)), for: .editingChanged)
        // Não deixa o campo esticar/encolher o layout do SwiftUI.
        tf.setContentHuggingPriority(.defaultLow, for: .horizontal)
        tf.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return tf
    }

    func updateUIView(_ tf: UITextField, context: Context) {
        let formatado = mask(text)
        if tf.text != formatado { tf.text = formatado }
        tf.isSecureTextEntry = isSecure
        tf.placeholder = placeholder
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UITextFieldDelegate {
        private let parent: MaskedTextField
        init(_ parent: MaskedTextField) { self.parent = parent }

        /// Formata a cada alteração (inclui colar) e mantém o cursor no fim.
        @objc func editingChanged(_ tf: UITextField) {
            let formatado = parent.mask(tf.text ?? "")
            tf.text = formatado
            if let fim = tf.position(from: tf.endOfDocument, offset: 0) {
                tf.selectedTextRange = tf.textRange(from: fim, to: fim)
            }
            if parent.text != formatado { parent.text = formatado }
        }
    }
}
