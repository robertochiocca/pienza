import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Quanto do fundo da tela o teclado esta cobrindo, em pontos.
 *
 * Este hook e o unico lugar do app que sabe que iOS e Android tratam o teclado de
 * formas diferentes, e ele existe para que o layout nao precise saber. No Android, com
 * `softwareKeyboardLayoutMode: resize` no app.json, a janela encolhe e o teclado nao
 * cobre nada — entao devolve 0. No iOS a janela nao muda e o teclado fica por cima,
 * entao devolve a altura dele.
 *
 * A tela recebe um numero e nao um ramo de plataforma. Sem isso, no iOS as tres unicas
 * acoes da tela de medida ficam embaixo do teclado, que foi o defeito do ciclo 6.
 */
export function useAlturaCobertaPorTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') return;

    // `WillShow` e nao `DidShow`: o layout sobe junto com o teclado em vez de dar um
    // salto depois que ele ja terminou de entrar.
    const aparece = Keyboard.addListener('keyboardWillShow', (e) =>
      setAltura(e.endCoordinates.height),
    );
    const some = Keyboard.addListener('keyboardWillHide', () => setAltura(0));
    return () => {
      aparece.remove();
      some.remove();
    };
  }, []);

  return altura;
}
