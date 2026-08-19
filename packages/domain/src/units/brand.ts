declare const brand: unique symbol;

/**
 * Tipo nominal sobre um primitivo. Impede que um numero solto seja passado
 * onde o dominio espera uma grandeza com unidade conhecida.
 */
export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };
