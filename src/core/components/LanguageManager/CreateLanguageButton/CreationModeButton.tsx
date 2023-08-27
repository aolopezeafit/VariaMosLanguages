import { Dropdown } from "react-bootstrap";
import config from './CreateLanguageButton.json';
import { useLanguageContext } from "../../../context/LanguageContext/LanguageContextProvider";
import { graphicalToTextual, textualToGraphical } from "../../LanguageDetail/GraphicalMode/SyntaxCompiler";

export default function CreationModeButton({handleModeClick}) {
  const{
    elements,
    setElements,
    relationships,
    setRelationships,
    restrictions,
    setRestrictions,
    abstractSyntax,
    setAbstractSyntax,
    concreteSyntax,
    setConcreteSyntax,
  } = useLanguageContext();

  const handleSwitchModeToGraphical = () => {
    if (abstractSyntax && concreteSyntax) {
      const { elements, relationships, restrictions } = textualToGraphical(abstractSyntax, concreteSyntax);
      if (elements) {
        setElements(elements);
      }
      if (relationships) {
        setRelationships(relationships);
      }
      if (restrictions) {
        setRestrictions(restrictions)
      }
    }
  };

  const handleSwitchModeToTexual = () => {
    const {abstractSyntax, concreteSyntax} = graphicalToTextual(elements, relationships, restrictions);
    setAbstractSyntax(abstractSyntax);
    setConcreteSyntax(concreteSyntax);
  }

    return (
      <Dropdown>
        <Dropdown.Toggle variant="primary" id="createLanguageDropdown">
          Mode
        </Dropdown.Toggle>
  
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => {handleSwitchModeToGraphical(); handleModeClick(config.modeGraphicalLabel)}}>
            {config.modeGraphicalLabel}
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={() => {handleSwitchModeToTexual(); handleModeClick(config.modeTextualLabel)}}>
            {config.modeTextualLabel}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }