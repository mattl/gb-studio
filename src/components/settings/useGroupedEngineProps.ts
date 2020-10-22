import uniq from "lodash/uniq";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import l10n from "../../lib/helpers/l10n";
import { RootState } from "../../store/configureStore";
import { EnginePropSchemaField } from "../../store/features/engine/engineState";

export type EnginePropGroup = {
  name: string;
  searchMatches: string[];
  fields: EnginePropSchemaField[];
};

export const useGroupedEngineProps = () => {
  const fields = useSelector((state: RootState) => state.engine.fields);
  const [groupedFields, setGroupedFields] = useState<EnginePropGroup[]>([]);

  useEffect(() => {
    const groups = uniq(fields.map((f) => f.group));
    setGroupedFields(
      groups.map((g) => {
        const groupFields = fields.filter((f) => f.group === g);
        return {
          name: g,
          searchMatches: ([] as string[]).concat(
            l10n(g),
            groupFields.map((field) => field.key),
            groupFields.map((field) => l10n(field.label))
          ),
          fields: groupFields,
        };
      })
    );
  }, [fields]);

  return groupedFields;
};
