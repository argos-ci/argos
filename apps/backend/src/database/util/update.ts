import { ModelObject, PartialModelObject } from "objection";

import { Model } from "./model";

type MakePropsOptional<T> = {
  [K in keyof T]: T[K] | undefined;
};

/**
 * Get a partial model update object.
 * Returns null if there are no changes.
 * @param existing The existing model
 * @param props The props to update
 * @returns The partial model update object or null if there are no changes.
 */
export function getPartialModelUpdate<
  TModel extends Model,
  TProps extends MakePropsOptional<PartialModelObject<TModel>>,
>(existing: TModel, props: TProps): PartialModelObject<TModel> | null {
  const keys = Object.keys(props) as Array<keyof ModelObject<TModel>>;
  const [toUpdate, hasChanges] = keys.reduce<
    [PartialModelObject<TModel>, boolean]
  >(
    (acc, key) => {
      const value = props[key];
      if (value !== undefined && existing[key] !== value) {
        const [toUpdate] = acc;
        toUpdate[key] = value as any;
        return [toUpdate, true];
      }
      return acc;
    },
    [{}, false],
  );

  return hasChanges ? toUpdate : null;
}
