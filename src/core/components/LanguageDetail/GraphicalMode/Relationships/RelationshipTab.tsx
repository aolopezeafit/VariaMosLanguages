import { useLanguageContext } from "../../../../context/LanguageContext/LanguageContextProvider";
import RelationshipForm from "./RelationshipForm";
import ItemTab from "../Utils/ItemListWithForm";

export default function RelationshipTab() {
  const { relationships, setRelationships } = useLanguageContext();
  const newRelationship = {
    name: `Relationship ${relationships.length + 1}`,
    min: "",
    max: "",
    source: "",
    target: "",
    label_property: "",
    properties: [],
    labels : [],
    styles:[]
  };

  return (
    <ItemTab
      items={relationships}
      setItems={setRelationships}
      newItem={newRelationship}
      label="relationship"
      FormComponent={RelationshipForm} 
      withProperties={true}
      withLabels={true}
      withStyles={true}/>
  );
}
