from langgraph.graph import StateGraph, START, END
from langchain_core.language_models import BaseChatModel  # type: ignore[import]

from .state import NoteState
from .nodes import make_nodes


def create_note_graph(llm: BaseChatModel):
    """Build and compile the note-generation graph for the given LLM."""
    nodes = make_nodes(llm)

    graph = StateGraph(NoteState)

    graph.add_node("assess_length", nodes["assess_length"])
    graph.add_node("map_summarize", nodes["map_summarize"])
    graph.add_node("generate_notes_agent", nodes["generate_notes_agent"])
    graph.add_node("format_output", nodes["format_output"])

    graph.add_edge(START, "assess_length")
    graph.add_conditional_edges(
        "assess_length",
        nodes["route_after_assess"],
        {
            "map_summarize": "map_summarize",
            "generate_notes_agent": "generate_notes_agent",
        },
    )
    graph.add_edge("map_summarize", "generate_notes_agent")
    graph.add_edge("generate_notes_agent", "format_output")
    graph.add_edge("format_output", END)

    return graph.compile()
